import { Router } from "express";
import * as usuarioController from "./usuarios.controller.js";
import {
  validateLogin,
  validateRegistroPublico,
  validateCrearUsuarioAdmin,
  validateActualizarUsuario,
  validateIdParam,
} from "./usuarios.validation.js";
import { handleValidationErrors } from "../../middlewares/validation.middleware.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../../middlewares/auth.middleware.js";

const router = Router();

// Rutas Públicas
router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  usuarioController.login
);

router.post(
  "/registro",
  validateRegistroPublico,
  handleValidationErrors,
  usuarioController.registerPublic
);

// Rutas Autenticadas Comunes
router.get("/perfil", authenticateToken, usuarioController.getProfile);

// Rutas Exclusivas de Administradores
router.get(
  "/",
  authenticateToken,
  authorizeRoles("administrador"),
  usuarioController.listUsers
);

router.get(
  "/roles",
  authenticateToken,
  authorizeRoles("administrador"),
  usuarioController.listRoles
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("administrador"),
  validateCrearUsuarioAdmin,
  handleValidationErrors,
  usuarioController.createUserAdmin
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("administrador"),
  validateActualizarUsuario,
  handleValidationErrors,
  usuarioController.updateUser
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("administrador"),
  validateIdParam,
  handleValidationErrors,
  usuarioController.deleteUser
);

export default router;
