import { body, param, query } from "express-validator";

export const validateCrearProducto = [
  body("codigo")
    .trim()
    .notEmpty()
    .withMessage("El código del producto es obligatorio")
    .isLength({ max: 50 })
    .withMessage("El código no puede exceder 50 caracteres"),
  body("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isLength({ max: 150 })
    .withMessage("El nombre no puede exceder 150 caracteres"),
  body("categoria_id")
    .isInt({ min: 1 })
    .withMessage("Debe seleccionar una categoría válida"),
  body("precio_compra")
    .isFloat({ min: 0 })
    .withMessage("El precio de compra debe ser un valor numérico mayor o igual a cero"),
  body("precio_venta")
    .isFloat({ min: 0.01 })
    .withMessage("El precio de venta debe ser un número positivo"),
  body("stock_minimo")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El stock mínimo debe ser un número entero no negativo"),
];

export const validateActualizarProducto = [
  param("id").isInt({ min: 1 }).withMessage("ID de producto no válido"),
  body("codigo")
    .trim()
    .notEmpty()
    .withMessage("El código del producto es obligatorio"),
  body("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio"),
  body("categoria_id")
    .isInt({ min: 1 })
    .withMessage("Debe seleccionar una categoría válida"),
  body("precio_compra")
    .isFloat({ min: 0 })
    .withMessage("El precio de compra debe ser mayor o igual a cero"),
  body("precio_venta")
    .isFloat({ min: 0.01 })
    .withMessage("El precio de venta debe ser positivo"),
  body("stock_minimo")
    .isInt({ min: 0 })
    .withMessage("El stock mínimo debe ser no negativo"),
  body("activo")
    .isBoolean()
    .withMessage("El estado activo debe ser booleano"),
];

export const validateCrearLote = [
  body("producto_id")
    .isInt({ min: 1 })
    .withMessage("Debe especificar un ID de producto válido"),
  body("numero_lote")
    .trim()
    .notEmpty()
    .withMessage("El número de lote es obligatorio"),
  body("fecha_vencimiento")
    .isISO8601()
    .withMessage("Debe ingresar una fecha de vencimiento válida (formato YYYY-MM-DD)")
    .custom((val) => {
      const fecha = new Date(val);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha <= hoy) {
        throw new Error("La fecha de vencimiento debe ser posterior al día de hoy");
      }
      return true;
    }),
  body("cantidad")
    .isInt({ min: 1 })
    .withMessage("La cantidad inicial del lote debe ser un entero mayor a cero"),
];

export const validateAjustarStock = [
  body("lote_id")
    .isInt({ min: 1 })
    .withMessage("ID de lote inválido"),
  body("nueva_cantidad")
    .isInt({ min: 0 })
    .withMessage("La nueva cantidad debe ser un entero mayor o igual a cero"),
  body("justificacion")
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage("Debe proveer una justificación de entre 5 y 255 caracteres para el ajuste"),
];

export const validateIdParam = [
  param("id").isInt({ min: 1 }).withMessage("ID inválido"),
];
