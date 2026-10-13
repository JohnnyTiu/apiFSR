import { Router } from "express";
import * as inventarioController from "./inventario.controller.js";
import {
  validateCrearProducto,
  validateActualizarProducto,
  validateCrearLote,
  validateAjustarStock,
  validateIdParam,
} from "./inventario.validation.js";
import { handleValidationErrors } from "../../middlewares/validation.middleware.js";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de inventario requieren autenticación
router.use(authenticateToken);

// Alertas y Categorías
router.get("/alertas", inventarioController.getAlertas);
router.get("/categorias", inventarioController.getCategorias);
router.get("/movimientos", inventarioController.getMovimientos);

// Lotes
router.get("/lotes", inventarioController.getLotes);
router.post(
  "/lotes",
  validateCrearLote,
  handleValidationErrors,
  inventarioController.createLote
);
router.post(
  "/lotes/ajuste",
  validateAjustarStock,
  handleValidationErrors,
  inventarioController.ajustarStockLote
);

// Productos CRUD
router.get("/", inventarioController.getProductos);
router.get("/:id", validateIdParam, handleValidationErrors, inventarioController.getProductoById);
router.post(
  "/",
  validateCrearProducto,
  handleValidationErrors,
  inventarioController.createProducto
);
router.put(
  "/:id",
  validateActualizarProducto,
  handleValidationErrors,
  inventarioController.updateProducto
);
router.delete(
  "/:id",
  authorizeRoles("administrador"),
  validateIdParam,
  handleValidationErrors,
  inventarioController.deleteProducto
);

export default router;
