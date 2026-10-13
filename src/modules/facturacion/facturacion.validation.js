import { body, param, query } from "express-validator";

export const validateCrearFactura = [
  body("cliente_nombre")
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage("El nombre del cliente no debe exceder 150 caracteres"),
  body("cliente_nit")
    .optional()
    .trim()
    .isLength({ max: 25 })
    .withMessage("El NIT no debe exceder 25 caracteres"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("La factura debe contener al menos un producto"),
  body("items.*.producto_id")
    .isInt({ min: 1 })
    .withMessage("Cada ítem debe tener un ID de producto válido"),
  body("items.*.cantidad")
    .isInt({ min: 1 })
    .withMessage("La cantidad facturada debe ser un número entero mayor a cero"),
];

export const validateAnularFactura = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID de factura no válido"),
  body("motivo_anulacion")
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage("Debe indicar un motivo de anulación válido (mínimo 5 caracteres)"),
];

export const validateIdParam = [
  param("id").isInt({ min: 1 }).withMessage("ID no válido"),
];
