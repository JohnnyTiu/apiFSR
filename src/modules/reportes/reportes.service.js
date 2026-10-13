import pool from "../../config/db.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// Obtener los datos consolidados reales del inventario para los reportes
export const getDatosReporteInventario = async () => {
  const [rows] = await pool.query(`
    SELECT 
      p.id,
      p.codigo,
      p.nombre,
      c.nombre AS categoria,
      p.precio_compra,
      p.precio_venta,
      p.stock_minimo,
      COALESCE(SUM(l.cantidad_actual), 0) AS existencias,
      (COALESCE(SUM(l.cantidad_actual), 0) * p.precio_compra) AS valor_total_compra,
      (COALESCE(SUM(l.cantidad_actual), 0) * p.precio_venta) AS valor_total_venta
    FROM productos p
    INNER JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = 1 AND l.fecha_vencimiento >= CURDATE()
    WHERE p.activo = 1
    GROUP BY p.id
    ORDER BY c.nombre ASC, p.nombre ASC
  `);
  return rows;
};

/**
 * Generador de PDF de inventario actual
 * Cumple con:
 * - Nombre de la farmacia
 * - Fecha y hora de generación
 * - Tabla con código, nombre, categoría, existencias y precio
 * - Avisos sobre productos con existencias bajas
 */
export const generarPdfInventario = async () => {
  const datos = await getDatosReporteInventario();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Encabezado
    doc
      .fillColor("#047857") // Verde esmeralda farmacia
      .fontSize(20)
      .text("FARMACIA SAN RAFAEL", { align: "center", bold: true });

    doc
      .fillColor("#374151")
      .fontSize(12)
      .text("REPORTE OFICIAL DE INVENTARIO ACTUAL", { align: "center" });

    const fechaGeneracion = new Date().toLocaleString("es-GT", {
      dateStyle: "full",
      timeStyle: "medium",
    });

    doc
      .fontSize(9)
      .fillColor("#6B7280")
      .text(`Generado el: ${fechaGeneracion}`, { align: "center" });

    doc.moveDown(1.5);

    // Resumen de alertas si hay stock bajo
    const productosStockBajo = datos.filter((p) => Number(p.existencias) <= Number(p.stock_minimo));
    if (productosStockBajo.length > 0) {
      doc
        .rect(40, doc.y, 532, 24)
        .fill("#FEF2F2")
        .stroke("#F87171");

      doc
        .fillColor("#991B1B")
        .fontSize(9)
        .text(
          `⚠️ ALERTA: ${productosStockBajo.length} producto(s) presentan existencias iguales o inferiores al stock mínimo sugerido.`,
          48,
          doc.y + 7
        );
      doc.moveDown(1.5);
    }

    // Cabecera de la tabla
    const tableTop = doc.y;
    doc.rect(40, tableTop, 532, 20).fill("#E5E7EB");

    doc.fillColor("#111827").fontSize(9);
    doc.text("Código", 45, tableTop + 5, { width: 65, bold: true });
    doc.text("Producto", 115, tableTop + 5, { width: 175, bold: true });
    doc.text("Categoría", 295, tableTop + 5, { width: 110, bold: true });
    doc.text("Existencias", 410, tableTop + 5, { width: 60, align: "right", bold: true });
    doc.text("Precio Venta", 475, tableTop + 5, { width: 90, align: "right", bold: true });

    let currentY = tableTop + 24;

    // Filas de productos
    datos.forEach((p, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 40;
      }

      const esStockBajo = Number(p.existencias) <= Number(p.stock_minimo);

      if (index % 2 === 0) {
        doc.rect(40, currentY - 2, 532, 18).fill("#F9FAFB");
      }

      doc.fillColor(esStockBajo ? "#B91C1C" : "#374151").fontSize(8.5);

      doc.text(p.codigo, 45, currentY, { width: 65 });
      doc.text(p.nombre, 115, currentY, { width: 175, ellipsis: true });
      doc.text(p.categoria, 295, currentY, { width: 110, ellipsis: true });
      
      const stockTexto = esStockBajo ? `${p.existencias} (!)` : `${p.existencias}`;
      doc.text(stockTexto, 410, currentY, { width: 60, align: "right" });
      doc.text(`Q${Number(p.precio_venta).toFixed(2)}`, 475, currentY, { width: 90, align: "right" });

      currentY += 18;
    });

    // Pie de página
    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("#9CA3AF")
      .text("Farmacia San Rafael — Sistema de Gestión Integral de Inventario y Ventas", {
        align: "center",
      });

    doc.end();
  });
};

/**
 * Generador de Reporte Excel con ExcelJS
 * Cumple con:
 * - Código, Nombre, Categoría, Existencias, Precio Compra, Precio Venta y Valor Total
 */
export const generarExcelInventario = async () => {
  const datos = await getDatosReporteInventario();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Farmacia San Rafael";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Inventario General", {
    views: [{ showGridLines: true }],
  });

  // Título
  worksheet.mergeCells("A1:G1");
  const titleRow = worksheet.getCell("A1");
  titleRow.value = "FARMACIA SAN RAFAEL — REPORTE DETALLADO DE INVENTARIO";
  titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF047857" }, // Verde farmacia
  };
  titleRow.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Fecha
  worksheet.mergeCells("A2:G2");
  const dateRow = worksheet.getCell("A2");
  dateRow.value = `Generado el: ${new Date().toLocaleString()}`;
  dateRow.font = { name: "Arial", size: 10, italic: true };
  dateRow.alignment = { horizontal: "center" };

  // Definición de columnas
  worksheet.getRow(4).values = [
    "Código",
    "Nombre del Producto",
    "Categoría",
    "Existencias Vigentes",
    "Precio de Compra (Q)",
    "Precio de Venta (Q)",
    "Valor Total en Stock (Q)",
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" }, // Gris oscuro
  };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 24;

  let totalInventarioValor = 0;
  let totalUnidades = 0;

  datos.forEach((p) => {
    const valorTotal = Number(p.existencias) * Number(p.precio_compra);
    totalInventarioValor += valorTotal;
    totalUnidades += Number(p.existencias);

    const row = worksheet.addRow([
      p.codigo,
      p.nombre,
      p.categoria,
      Number(p.existencias),
      Number(p.precio_compra),
      Number(p.precio_venta),
      valorTotal,
    ]);

    row.getCell(4).numFmt = "#,##0";
    row.getCell(5).numFmt = "Q#,##0.00";
    row.getCell(6).numFmt = "Q#,##0.00";
    row.getCell(7).numFmt = "Q#,##0.00";
  });

  // Fila de Totales
  const totalRow = worksheet.addRow([
    "TOTALES",
    "",
    "",
    totalUnidades,
    "",
    "",
    totalInventarioValor,
  ]);
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  totalRow.getCell(4).numFmt = "#,##0";
  totalRow.getCell(7).numFmt = "Q#,##0.00";

  // Ajustar anchos de columna
  worksheet.columns = [
    { width: 14 },
    { width: 38 },
    { width: 26 },
    { width: 20 },
    { width: 22 },
    { width: 20 },
    { width: 24 },
  ];

  return workbook.xlsx.writeBuffer();
};
