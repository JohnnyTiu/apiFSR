import * as reportesService from "./reportes.service.js";

// Endpoint de descarga de Reporte PDF
export const descargarPdfInventario = async (req, res, next) => {
  try {
    const pdfBuffer = await reportesService.generarPdfInventario();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inventario_san_rafael_${Date.now()}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// Endpoint de descarga de Reporte Excel
export const descargarExcelInventario = async (req, res, next) => {
  try {
    const excelBuffer = await reportesService.generarExcelInventario();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inventario_san_rafael_${Date.now()}.xlsx"`
    );
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};
