import pool from "../../config/db.js";

// Listar facturas con paginación/búsqueda
export const getFacturas = async ({ limit = 50, search = "", estado = "" }) => {
  let query = `
    SELECT 
      f.id,
      f.numero_factura,
      f.cliente_nombre,
      f.cliente_nit,
      f.subtotal,
      f.impuesto,
      f.total,
      f.estado,
      f.fecha_emision,
      f.fecha_anulacion,
      f.motivo_anulacion,
      u.nombre AS cajero_nombre,
      ua.nombre AS usuario_anulacion_nombre
    FROM facturas f
    INNER JOIN usuarios u ON f.usuario_id = u.id
    LEFT JOIN usuarios ua ON f.usuario_anulacion_id = ua.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (f.numero_factura LIKE ? OR f.cliente_nombre LIKE ? OR f.cliente_nit LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (estado) {
    query += ` AND f.estado = ?`;
    params.push(estado);
  }

  query += ` ORDER BY f.id DESC LIMIT ?`;
  params.push(Number(limit));

  const [rows] = await pool.query(query, params);
  return rows;
};

// Obtener factura por ID con sus líneas de detalle
export const getFacturaById = async (id) => {
  const [facturas] = await pool.query(
    `SELECT 
      f.*,
      u.nombre AS cajero_nombre,
      ua.nombre AS usuario_anulacion_nombre
     FROM facturas f
     INNER JOIN usuarios u ON f.usuario_id = u.id
     LEFT JOIN usuarios ua ON f.usuario_anulacion_id = ua.id
     WHERE f.id = ?`,
    [id]
  );

  if (facturas.length === 0) return null;
  const factura = facturas[0];

  const [detalles] = await pool.query(
    `SELECT 
      d.id,
      d.factura_id,
      d.producto_id,
      d.lote_id,
      d.cantidad,
      d.precio_unitario,
      d.subtotal,
      p.nombre AS producto_nombre,
      p.codigo AS producto_codigo,
      l.numero_lote,
      l.fecha_vencimiento
     FROM detalles_factura d
     INNER JOIN productos p ON d.producto_id = p.id
     INNER JOIN lotes l ON d.lote_id = l.id
     WHERE d.factura_id = ?`,
    [id]
  );

  return {
    ...factura,
    detalles,
  };
};

/**
 * CREAR FACTURA CON TRANSACCIÓN ATÓMICA
 * Reglas de negocio obligatorias:
 * 1. Calcula precios y subtotales en el servidor basándose en la BD, nunca en el cliente.
 * 2. Comprueba stock total de productos activos.
 * 3. Consume lotes utilizando política FEFO (First Expired, First Out) con fechas válidas.
 * 4. Descuenta la cantidad exacta de cada lote e inserta los detalles.
 * 5. Registra la salida en la bitácora de movimientos_inventario.
 * 6. En caso de cualquier error, efectúa ROLLBACK sin dejar datos huérfanos.
 */
export const crearFactura = async ({ cliente_nombre, cliente_nit, items, usuario_id }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let subtotalGeneral = 0;
    const detallesParaInsertar = [];
    const movimientosParaInsertar = [];

    // Generar correlativo único de factura
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    const numeroFactura = `FAC-${timestamp}-${random}`;

    for (const item of items) {
      const { producto_id, cantidad } = item;

      // 1. Obtener datos y precio real de la base de datos
      const [prods] = await connection.query(
        `SELECT id, nombre, codigo, precio_venta, activo FROM productos WHERE id = ? FOR UPDATE`,
        [producto_id]
      );

      if (prods.length === 0 || !prods[0].activo) {
        throw new Error(`El producto con ID ${producto_id} no existe o no está activo.`);
      }

      const producto = prods[0];
      const precioUnitario = Number(producto.precio_venta);

      // 2. Obtener lotes vigentes ordenados por FEFO (First Expired First Out)
      const [lotes] = await connection.query(
        `SELECT id, numero_lote, cantidad_actual, fecha_vencimiento 
         FROM lotes 
         WHERE producto_id = ? AND activo = 1 AND fecha_vencimiento >= CURDATE() AND cantidad_actual > 0 
         ORDER BY fecha_vencimiento ASC 
         FOR UPDATE`,
        [producto_id]
      );

      const stockDisponible = lotes.reduce((acc, l) => acc + l.cantidad_actual, 0);

      if (stockDisponible < cantidad) {
        throw new Error(
          `Stock insuficiente para '${producto.nombre}'. Solicitado: ${cantidad}, disponible vigente: ${stockDisponible}`
        );
      }

      // 3. Descontar cantidad de los lotes correspondientes por FEFO
      let cantidadRestantePorDescontar = cantidad;

      for (const lote of lotes) {
        if (cantidadRestantePorDescontar <= 0) break;

        const cantidadADescontar = Math.min(lote.cantidad_actual, cantidadRestantePorDescontar);
        const subtotalLinea = Number((cantidadADescontar * precioUnitario).toFixed(2));

        // Actualizar stock del lote
        await connection.query(
          `UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?`,
          [cantidadADescontar, lote.id]
        );

        // Preparar detalle de factura vinculado al lote específico
        detallesParaInsertar.push({
          producto_id: producto.id,
          lote_id: lote.id,
          cantidad: cantidadADescontar,
          precio_unitario: precioUnitario,
          subtotal: subtotalLinea,
        });

        // Preparar movimiento de auditoría
        movimientosParaInsertar.push({
          producto_id: producto.id,
          lote_id: lote.id,
          usuario_id,
          tipo_movimiento: "SALIDA_VENTA",
          cantidad: cantidadADescontar,
          justificacion: `Venta según Factura ${numeroFactura}`,
        });

        subtotalGeneral += subtotalLinea;
        cantidadRestantePorDescontar -= cantidadADescontar;
      }
    }

    subtotalGeneral = Number(subtotalGeneral.toFixed(2));
    const impuesto = 0.00; // Si aplica IVA se puede calcular aquí
    const totalGeneral = Number((subtotalGeneral + impuesto).toFixed(2));

    // 4. Insertar cabecera de la factura
    const [facturaResult] = await connection.query(
      `INSERT INTO facturas (numero_factura, usuario_id, cliente_nombre, cliente_nit, subtotal, impuesto, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'EMITIDA')`,
      [
        numeroFactura,
        usuario_id,
        cliente_nombre || "Consumidor Final",
        cliente_nit || "CF",
        subtotalGeneral,
        impuesto,
        totalGeneral,
      ]
    );

    const facturaId = facturaResult.insertId;

    // 5. Insertar líneas de detalle
    for (const d of detallesParaInsertar) {
      await connection.query(
        `INSERT INTO detalles_factura (factura_id, producto_id, lote_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [facturaId, d.producto_id, d.lote_id, d.cantidad, d.precio_unitario, d.subtotal]
      );
    }

    // 6. Insertar movimientos en bitácora
    for (const m of movimientosParaInsertar) {
      await connection.query(
        `INSERT INTO movimientos_inventario (producto_id, lote_id, usuario_id, tipo_movimiento, cantidad, justificacion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [m.producto_id, m.lote_id, m.usuario_id, m.tipo_movimiento, m.cantidad, m.justificacion]
      );
    }

    // Confirmar la transacción
    await connection.commit();

    return getFacturaById(facturaId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * ANULAR FACTURA CON TRANSACCIÓN ATÓMICA
 * Reglas de negocio obligatorias:
 * 1. Comprueba que exista y que su estado sea 'EMITIDA' (no re-anular).
 * 2. Restaura exactamente las cantidades que descontó a los lotes específicos de donde salieron.
 * 3. Registra movimientos de tipo 'REVERSION_ANULACION'.
 * 4. Actualiza estado a 'ANULADA', fecha, usuario y motivo.
 */
export const anularFactura = async ({ factura_id, motivo_anulacion, usuario_id }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [facturas] = await connection.query(
      `SELECT * FROM facturas WHERE id = ? FOR UPDATE`,
      [factura_id]
    );

    if (facturas.length === 0) {
      throw new Error("Factura no encontrada.");
    }

    const factura = facturas[0];

    if (factura.estado === "ANULADA") {
      throw new Error("La factura ya se encuentra anulada previamente.");
    }

    // Obtener las líneas de detalle con los lotes que se afectaron
    const [detalles] = await connection.query(
      `SELECT * FROM detalles_factura WHERE factura_id = ?`,
      [factura_id]
    );

    for (const d of detalles) {
      // Revertir existencias al lote exacto
      await connection.query(
        `UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?`,
        [d.cantidad, d.lote_id]
      );

      // Registrar movimiento de auditoría por anulación
      await connection.query(
        `INSERT INTO movimientos_inventario (producto_id, lote_id, usuario_id, tipo_movimiento, cantidad, justificacion)
         VALUES (?, ?, ?, 'REVERSION_ANULACION', ?, ?)`,
        [
          d.producto_id,
          d.lote_id,
          usuario_id,
          d.cantidad,
          `Reversión por anulación de Factura ${factura.numero_factura}: ${motivo_anulacion}`,
        ]
      );
    }

    // Actualizar estado de la factura
    await connection.query(
      `UPDATE facturas 
       SET estado = 'ANULADA', 
           fecha_anulacion = NOW(), 
           usuario_anulacion_id = ?, 
           motivo_anulacion = ? 
       WHERE id = ?`,
      [usuario_id, motivo_anulacion, factura_id]
    );

    await connection.commit();

    return getFacturaById(factura_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
