import { validationResult } from "express-validator";

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Errores de validación en los datos enviados",
      errors: errors.array().map((err) => ({
        campo: err.path || err.param,
        mensaje: err.msg,
      })),
    });
  }
  next();
};
