import { Router } from "express";
import * as reportesController from "./reportes.controller.js";
import { authenticateToken } from "../../middlewares/auth.middleware.js";

const router = Router();

// Descarga protegida con autenticación
router.use(authenticateToken);

router.get("/inventario/pdf", reportesController.descargarPdfInventario);
router.get("/inventario/excel", reportesController.descargarExcelInventario);

export default router;
