import pool from "../../config/db.js";

// ================= PRODUCTOS =================

// Listar productos con existencias calculadas en tiempo real de sus lotes activos
export const getProductos = async ({ search = "", categoria_id = "" }) => {
  let query = `
    SELECT 
      p.id,
      p.codigo,
      p.nombre,
      p.descripcion,
      p.categoria_id,
      c.nombre AS categoria,
      p.precio_compra,
      p.precio_venta,
      p.stock_minimo,
      p.activo,
      COALESCE(SUM(l.cantidad_actual), 0) AS stock_total,
      COUNT(DISTINCT l.id) AS total_lotes
    FROM productos p
    INNER JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = 1 AND l.fecha_vencimiento >= CURDATE()
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (p.nombre LIKE ? OR p.codigo LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (categoria_id) {
    query += ` AND p.categoria_id = ?`;
    params.push(categoria_id);
  }

  query += ` GROUP BY p.id ORDER BY p.id DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
};

// Obtener producto por ID con detalle de lotes
export const getProductoById = async (id) => {
  const [prods] = await pool.query(
    `SELECT p.*, c.nombre AS categoria 
     FROM productos p 
     INNER JOIN categorias c ON p.categoria_id = c.id 
     WHERE p.id = ?`,
    [id]
  );

  if (prods.length === 0) return null;

  const producto = prods[0];

  const [lotes] = await pool.query(
    `SELECT * FROM lotes WHERE producto_id = ? AND activo = 1 ORDER BY fecha_vencimiento ASC`,
    [id]
  );

  const stockTotal = lotes.reduce((acc, l) => acc + l.cantidad_actual, 0);

  return {
    ...producto,
    stock_total: stockTotal,
    lotes,
  };
};

export const getProductoByCodigo = async (codigo) => {
  const [rows] = await pool.query(`SELECT * FROM productos WHERE codigo = ?`, [codigo]);
  return rows[0] || null;
};

export const createProducto = async ({
  codigo,
  nombre,
  descripcion,
  categoria_id,
  precio_compra,
  precio_venta,
  stock_minimo,
}) => {
  const [result] = await pool.query(
    `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo || 10]
  );
  return getProductoById(result.insertId);
};

export const updateProducto = async (id, data) => {
  const { codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, activo } = data;
  await pool.query(
    `UPDATE productos 
     SET codigo = ?, nombre = ?, descripcion = ?, categoria_id = ?, precio_compra = ?, precio_venta = ?, stock_minimo = ?, activo = ?
     WHERE id = ?`,
    [codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, activo, id]
  );
  return getProductoById(id);
};

export const deleteProducto = async (id) => {
  // Comprobar si tiene registros en ventas
  const [detalles] = await pool.query(`SELECT id FROM detalles_factura WHERE producto_id = ? LIMIT 1`, [id]);
  if (detalles.length > 0) {
    // Si ya tiene facturación, se desactiva de forma lógica para mantener la integridad referencial
    await pool.query(`UPDATE productos SET activo = 0 WHERE id = ?`, [id]);
    return { tipo: "desactivado", mensaje: "El producto tiene historial de ventas, por lo que fue desactivado del catálogo." };
  }

  // Eliminar lotes y movimientos si no hay ventas
  await pool.query(`DELETE FROM movimientos_inventario WHERE producto_id = ?`, [id]);
  await pool.query(`DELETE FROM lotes WHERE producto_id = ?`, [id]);
  await pool.query(`DELETE FROM productos WHERE id = ?`, [id]);
  return { tipo: "eliminado", mensaje: "Producto eliminado correctamente." };
};

// ================= CATEGORIAS =================
export const getCategorias = async () => {
  const [rows] = await pool.query(`SELECT * FROM categorias ORDER BY nombre ASC`);
  return rows;
};

// ================= LOTES =================
export const getLotes = async (producto_id = null) => {
  let query = `
    SELECT 
      l.*,
      p.nombre AS producto_nombre,
      p.codigo AS producto_codigo,
      DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_para_vencer
    FROM lotes l
    INNER JOIN productos p ON l.producto_id = p.id
    WHERE l.activo = 1
  `;
  const params = [];

  if (producto_id) {
    query += ` AND l.producto_id = ?`;
    params.push(producto_id);
  }

  query += ` ORDER BY l.fecha_vencimiento ASC`;

  const [rows] = await pool.query(query, params);
  return rows;
};

export const createLote = async ({ producto_id, numero_lote, fecha_vencimiento, cantidad, usuario_id }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [producto_id, numero_lote, fecha_vencimiento, cantidad, cantidad]
    );

    const loteId = result.insertId;

    // Registrar en bitácora de movimientos
    await connection.query(
      `INSERT INTO movimientos_inventario (producto_id, lote_id, usuario_id, tipo_movimiento, cantidad, justificacion)
       VALUES (?, ?, ?, 'ENTRADA', ?, 'Registro de nuevo lote')`,
      [producto_id, loteId, usuario_id, cantidad]
    );

    await connection.commit();

    const [newLote] = await pool.query(`SELECT * FROM lotes WHERE id = ?`, [loteId]);
    return newLote[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Ajuste manual de inventario en lote (con justificación obligatoria)
export const ajustarStockLote = async ({ lote_id, nueva_cantidad, justificacion, usuario_id }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [lotes] = await connection.query(`SELECT * FROM lotes WHERE id = ? FOR UPDATE`, [lote_id]);
    if (lotes.length === 0) {
      throw new Error("Lote no encontrado");
    }

    const lote = lotes[0];
    const diferencia = nueva_cantidad - lote.cantidad_actual;

    if (diferencia === 0) {
      await connection.rollback();
      return lote;
    }

    const tipoMovimiento = diferencia > 0 ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO";

    await connection.query(`UPDATE lotes SET cantidad_actual = ? WHERE id = ?`, [nueva_cantidad, lote_id]);

    await connection.query(
      `INSERT INTO movimientos_inventario (producto_id, lote_id, usuario_id, tipo_movimiento, cantidad, justificacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lote.producto_id, lote_id, usuario_id, tipoMovimiento, Math.abs(diferencia), justificacion]
    );

    await connection.commit();

    const [loteActualizado] = await pool.query(`SELECT * FROM lotes WHERE id = ?`, [lote_id]);
    return loteActualizado[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ================= ALERTAS Y DASHBOARD =================
export const getAlertasInventario = async () => {
  // Productos con existencias bajas (stock_total <= stock_minimo)
  const [stockBajo] = await pool.query(`
    SELECT 
      p.id,
      p.codigo,
      p.nombre,
      p.stock_minimo,
      COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = 1 AND l.fecha_vencimiento >= CURDATE()
    WHERE p.activo = 1
    GROUP BY p.id
    HAVING stock_actual <= p.stock_minimo
    ORDER BY stock_actual ASC
  `);

  // Lotes próximos a vencer (en los próximos 60 días) o ya vencidos
  const [proximosAVencer] = await pool.query(`
    SELECT 
      l.id,
      l.numero_lote,
      l.fecha_vencimiento,
      l.cantidad_actual,
      p.codigo AS producto_codigo,
      p.nombre AS producto_nombre,
      DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes
    FROM lotes l
    INNER JOIN productos p ON l.producto_id = p.id
    WHERE l.activo = 1 AND l.cantidad_actual > 0 AND DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 60
    ORDER BY l.fecha_vencimiento ASC
  `);

  return {
    stock_bajo: stockBajo,
    proximos_a_vencer: proximosAVencer,
  };
};

export const getMovimientos = async () => {
  const [rows] = await pool.query(`
    SELECT 
      m.id,
      m.tipo_movimiento,
      m.cantidad,
      m.justificacion,
      m.created_at,
      p.nombre AS producto_nombre,
      p.codigo AS producto_codigo,
      l.numero_lote,
      u.nombre AS usuario_nombre
    FROM movimientos_inventario m
    INNER JOIN productos p ON m.producto_id = p.id
    LEFT JOIN lotes l ON m.lote_id = l.id
    INNER JOIN usuarios u ON m.usuario_id = u.id
    ORDER BY m.id DESC
    LIMIT 100
  `);
  return rows;
};
