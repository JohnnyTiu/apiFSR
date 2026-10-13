import { body, param } from "express-validator";

export const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("La contraseña es requerida"),
];

export const validateRegistroPublico = [
  body("nombre")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("El nombre debe tener entre 3 y 100 caracteres"),
  body("email")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
];

export const validateCrearUsuarioAdmin = [
  body("nombre")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("El nombre debe tener entre 3 y 100 caracteres"),
  body("email")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("rol_id")
    .isInt({ min: 1 })
    .withMessage("El rol debe ser un ID válido"),
];

export const validateActualizarUsuario = [
  param("id").isInt({ min: 1 }).withMessage("ID de usuario no válido"),
  body("nombre")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("El nombre debe tener entre 3 y 100 caracteres"),
  body("email")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido")
    .normalizeEmail(),
  body("password")
    .optional({ values: "falsy" })
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres si se desea cambiar"),
  body("rol_id")
    .isInt({ min: 1 })
    .withMessage("El rol debe ser un ID válido"),
  body("activo")
    .isBoolean()
    .withMessage("El estado activo debe ser un booleano"),
];

export const validateIdParam = [
  param("id").isInt({ min: 1 }).withMessage("ID no válido"),
];
