import * as facturacionService from "./facturacion.service.js";

export const getFacturas = async (req, res, next) => {
  try {
    const { limit, search, estado } = req.query;
    const facturas = await facturacionService.getFacturas({ limit, search, estado });
    res.json({
      success: true,
      data: facturas,
    });
  } catch (error) {
    next(error);
  }
};

export const getFacturaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const factura = await facturacionService.getFacturaById(id);
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada.",
      });
    }
    res.json({
      success: true,
      data: factura,
    });
  } catch (error) {
    next(error);
  }
};

export const crearFactura = async (req, res, next) => {
  try {
    const { cliente_nombre, cliente_nit, items } = req.body;
    const usuario_id = req.user.id;

    const nuevaFactura = await facturacionService.crearFactura({
      cliente_nombre,
      cliente_nit,
      items,
      usuario_id,
    });

    res.status(201).json({
      success: true,
      message: "Factura emitida exitosamente.",
      data: nuevaFactura,
    });
  } catch (error) {
    // Si es un error de negocio de stock o validación
    if (error.message.includes("Stock insuficiente") || error.message.includes("no existe o no está activo")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const anularFactura = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;
    const usuario_id = req.user.id;

    const facturaAnulada = await facturacionService.anularFactura({
      factura_id: id,
      motivo_anulacion,
      usuario_id,
    });

    res.json({
      success: true,
      message: "Factura anulada exitosamente e inventario restituido.",
      data: facturaAnulada,
    });
  } catch (error) {
    if (error.message.includes("ya se encuentra anulada")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("Factura no encontrada")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
