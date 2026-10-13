import bcrypt from "bcryptjs";
import * as usuarioService from "./usuarios.service.js";

// Login de usuario
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await usuarioService.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas.",
      });
    }

    if (!user.activo) {
      return res.status(403).json({
        success: false,
        message: "Cuenta deshabilitada. Contacte al administrador.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas.",
      });
    }

    const token = usuarioService.generateToken(user);

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        token,
        usuario: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Registro público (Otorga estrictamente rol 'empleado', ID 2)
export const registerPublic = async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;

    const existingUser = await usuarioService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "El correo electrónico ya se encuentra registrado.",
      });
    }

    // Regla de seguridad obligatoria: El formulario público NUNCA puede crear administradores
    const ROL_EMPLEADO_ID = 2;
    const newUser = await usuarioService.createUser({
      nombre,
      email,
      password,
      rol_id: ROL_EMPLEADO_ID,
    });

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente con rol de empleado.",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res, next) => {
  try {
    const user = await usuarioService.findUserById(req.user.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Listar todos los usuarios (solo administradores)
export const listUsers = async (req, res, next) => {
  try {
    const users = await usuarioService.getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// Listar roles disponibles
export const listRoles = async (req, res, next) => {
  try {
    const roles = await usuarioService.getRoles();
    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

// Crear usuario desde panel administrativo
export const createUserAdmin = async (req, res, next) => {
  try {
    const { nombre, email, password, rol_id } = req.body;

    const existingUser = await usuarioService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "El correo electrónico ya está en uso.",
      });
    }

    const newUser = await usuarioService.createUser({
      nombre,
      email,
      password,
      rol_id,
    });

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente.",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar usuario (solo administrador)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol_id, activo } = req.body;

    const user = await usuarioService.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado.",
      });
    }

    // Verificar si el email ya pertenece a otro usuario
    const userWithEmail = await usuarioService.findUserByEmail(email);
    if (userWithEmail && userWithEmail.id !== Number(id)) {
      return res.status(409).json({
        success: false,
        message: "El correo electrónico ya está asignado a otro usuario.",
      });
    }

    const updatedUser = await usuarioService.updateUser(id, {
      nombre,
      email,
      password,
      rol_id,
      activo,
    });

    res.json({
      success: true,
      message: "Usuario actualizado correctamente.",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar usuario
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar tu propia cuenta de usuario en uso.",
      });
    }

    const user = await usuarioService.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado.",
      });
    }

    await usuarioService.deleteUser(id);
    res.json({
      success: true,
      message: "Usuario eliminado correctamente.",
    });
  } catch (error) {
    next(error);
  }
};
