import pool from "../../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Buscar usuario por correo electrónico
export const findUserByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, u.rol_id, r.nombre AS rol
     FROM usuarios u
     INNER JOIN roles r ON u.rol_id = r.id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
};

// Buscar usuario por ID
export const findUserById = async (id) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.activo, u.rol_id, r.nombre AS rol, u.created_at
     FROM usuarios u
     INNER JOIN roles r ON u.rol_id = r.id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
};

// Listar todos los usuarios (sin contraseñas)
export const getAllUsers = async () => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.activo, u.rol_id, r.nombre AS rol, u.created_at
     FROM usuarios u
     INNER JOIN roles r ON u.rol_id = r.id
     ORDER BY u.id DESC`
  );
  return rows;
};

// Listar los roles disponibles
export const getRoles = async () => {
  const [rows] = await pool.query(`SELECT id, nombre, descripcion FROM roles ORDER BY id ASC`);
  return rows;
};

// Crear usuario
export const createUser = async ({ nombre, email, password, rol_id }) => {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo)
     VALUES (?, ?, ?, ?, 1)`,
    [nombre, email, passwordHash, rol_id]
  );

  return findUserById(result.insertId);
};

// Actualizar usuario
export const updateUser = async (id, { nombre, email, password, rol_id, activo }) => {
  let query = `UPDATE usuarios SET nombre = ?, email = ?, rol_id = ?, activo = ?`;
  const params = [nombre, email, rol_id, activo];

  if (password) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    query += `, password_hash = ?`;
    params.push(passwordHash);
  }

  query += ` WHERE id = ?`;
  params.push(id);

  await pool.query(query, params);
  return findUserById(id);
};

// Eliminar usuario
export const deleteUser = async (id) => {
  const [result] = await pool.query(`DELETE FROM usuarios WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};

// Generar Token JWT
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      rol: user.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
};
