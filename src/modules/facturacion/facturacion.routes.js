import { Router } from "express";
import * as facturacionController from "./facturacion.controller.js";
import {
  validateCrearFactura,
  validateAnularFactura,
  validateIdParam,
} from "./facturacion.validation.js";
import { handleValidationErrors } from "../../middlewares/validation.middleware.js";
import { authenticateToken } from "../../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de facturación requieren autenticación
router.use(authenticateToken);

router.get("/", facturacionController.getFacturas);
router.get("/:id", validateIdParam, handleValidationErrors, facturacionController.getFacturaById);
router.post(
  "/",
  validateCrearFactura,
  handleValidationErrors,
  facturacionController.crearFactura
);
router.post(
  "/:id/anular",
  validateAnularFactura,
  handleValidationErrors,
  facturacionController.anularFactura
);

export default router;
