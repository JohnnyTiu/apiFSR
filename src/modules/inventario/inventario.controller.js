import * as inventarioService from "./inventario.service.js";

export const getProductos = async (req, res, next) => {
  try {
    const { search, categoria_id } = req.query;
    const productos = await inventarioService.getProductos({ search, categoria_id });
    res.json({
      success: true,
      data: productos,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await inventarioService.getProductoById(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado.",
      });
    }
    res.json({
      success: true,
      data: producto,
    });
  } catch (error) {
    next(error);
  }
};

export const createProducto = async (req, res, next) => {
  try {
    const { codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo } = req.body;

    const productoExistente = await inventarioService.getProductoByCodigo(codigo);
    if (productoExistente) {
      return res.status(409).json({
        success: false,
        message: `Ya existe un producto registrado con el código '${codigo}'.`,
      });
    }

    const nuevoProducto = await inventarioService.createProducto({
      codigo,
      nombre,
      descripcion,
      categoria_id,
      precio_compra,
      precio_venta,
      stock_minimo,
    });

    res.status(201).json({
      success: true,
      message: "Producto registrado exitosamente.",
      data: nuevoProducto,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, activo } = req.body;

    const producto = await inventarioService.getProductoById(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado.",
      });
    }

    const productoConCodigo = await inventarioService.getProductoByCodigo(codigo);
    if (productoConCodigo && productoConCodigo.id !== Number(id)) {
      return res.status(409).json({
        success: false,
        message: `El código '${codigo}' ya está asignado a otro producto.`,
      });
    }

    const productoActualizado = await inventarioService.updateProducto(id, {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      precio_compra,
      precio_venta,
      stock_minimo,
      activo,
    });

    res.json({
      success: true,
      message: "Producto actualizado correctamente.",
      data: productoActualizado,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await inventarioService.getProductoById(id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado.",
      });
    }

    const resultado = await inventarioService.deleteProducto(id);
    res.json({
      success: true,
      message: resultado.mensaje,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategorias = async (req, res, next) => {
  try {
    const categorias = await inventarioService.getCategorias();
    res.json({
      success: true,
      data: categorias,
    });
  } catch (error) {
    next(error);
  }
};

export const getLotes = async (req, res, next) => {
  try {
    const { producto_id } = req.query;
    const lotes = await inventarioService.getLotes(producto_id);
    res.json({
      success: true,
      data: lotes,
    });
  } catch (error) {
    next(error);
  }
};

export const createLote = async (req, res, next) => {
  try {
    const { producto_id, numero_lote, fecha_vencimiento, cantidad } = req.body;
    const usuario_id = req.user.id;

    const lote = await inventarioService.createLote({
      producto_id,
      numero_lote,
      fecha_vencimiento,
      cantidad,
      usuario_id,
    });

    res.status(201).json({
      success: true,
      message: "Lote registrado y existencias añadidas exitosamente.",
      data: lote,
    });
  } catch (error) {
    next(error);
  }
};

export const ajustarStockLote = async (req, res, next) => {
  try {
    const { lote_id, nueva_cantidad, justificacion } = req.body;
    const usuario_id = req.user.id;

    const loteActualizado = await inventarioService.ajustarStockLote({
      lote_id,
      nueva_cantidad,
      justificacion,
      usuario_id,
    });

    res.json({
      success: true,
      message: "Ajuste de inventario aplicado y auditado con éxito.",
      data: loteActualizado,
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertas = async (req, res, next) => {
  try {
    const alertas = await inventarioService.getAlertasInventario();
    res.json({
      success: true,
      data: alertas,
    });
  } catch (error) {
    next(error);
  }
};

export const getMovimientos = async (req, res, next) => {
  try {
    const movimientos = await inventarioService.getMovimientos();
    res.json({
      success: true,
      data: movimientos,
    });
  } catch (error) {
    next(error);
  }
};
