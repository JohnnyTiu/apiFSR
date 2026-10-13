import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// Middleware para verificar el Token JWT en el encabezado Authorization
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato: Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Acceso no autorizado. Se requiere un token de sesión.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validar que el usuario siga existiendo y esté activo en la base de datos
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.activo, r.nombre AS rol 
       FROM usuarios u 
       INNER JOIN roles r ON u.rol_id = r.id 
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].activo) {
      return res.status(401).json({
        success: false,
        message: "Usuario no válido o deshabilitado.",
      });
    }

    req.user = rows[0]; // { id, nombre, email, activo, rol }
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Token inválido o expirado.",
    });
  }
};

// Middleware para restringir acceso por roles (autorización)
export const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos suficientes para realizar esta acción.",
      });
    }
    next();
  };
};
