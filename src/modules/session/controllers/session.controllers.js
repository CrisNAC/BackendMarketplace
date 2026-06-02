//import { PrismaClient } from "@prisma/client";

//session.controllers.js
import { prisma } from "../../../lib/prisma.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { hashPassword,verifyPassword } from "../../../lib/utils/password.utils.js";
import { UnauthorizedError, ValidationError } from "../../../lib/errors.js";

dotenv.config();

/**
 * POST /api/session
 * Inicia sesión con email y contraseña.
 * 
 * ✓ NO loguea ni expone la contraseña
 * ✓ Compara con bcrypt de forma segura
 * ✓ Genera JWT con expiración
 * ✓ Establece cookie httpOnly
 * 
 * @throws {ValidationError} Email o password faltantes
 * @throws {UnauthorizedError} Credenciales inválidas
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validación
    if (!email || !password) {
      return next(new ValidationError("Debe ingresar email y contraseña"));
    }

    // Buscar usuario
    const user = await prisma.users.findFirst({
      where: {
        email,
        status: true,
      },
    });

    if (!user) {
      // SEGURIDAD: mensaje genérico para no revelar si el email existe
      return next(new UnauthorizedError("Credenciales inválidas"));
    }

    // Verificar contraseña con bcrypt (seguro, sin logs de password)
    const passwordMatch = await verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      return next(new UnauthorizedError("Credenciales inválidas"));
    }

    // Generar JWT con expiración
    const token = jwt.sign(
      {
        id_user: user.id_user,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    // Establecer cookie segura
    res.cookie("userToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 30 * 60 * 1000, // 30 minutos en ms
    });

    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: {
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // NO loguear detalles de error que expongan contraseñas
    console.error("[LOGIN_ERROR]", error.message);
    next(error);
  }
};

/**
 * DELETE /api/session
 * Cierra sesión eliminando la cookie del cliente.
 */
export const logout = async (req, res, next) => {
  try {
    res.clearCookie("userToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    return res.status(200).json({
      success: true,
      message: "Sesión cerrada correctamente",
    });
  } catch (error) {
    console.error("[LOGOUT_ERROR]", error.message);
    next(error);
  }
};

/**
 * GET /api/session/user-session
 * Obtiene los datos de la sesión activa desde el JWT en cookie.
 * 
 * ✓ Verifica el token JWT
 * ✓ Retorna datos mínimos del usuario (nunca password)
 * ✓ Incluye roles y asociaciones (store, delivery)
 */
export const userSession = async (req, res, next) => {
  try {
    const token = req.cookies.userToken;

    if (!token) {
      return next(new UnauthorizedError("No autenticado"));
    }

    // Verificar y decodificar JWT
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return next(new UnauthorizedError("Token expirado"));
      }
      return next(new UnauthorizedError("Token inválido"));
    }

    // Buscar usuario activo
    const user = await prisma.users.findFirst({
      where: {
        id_user: decodedToken.id_user,
        status: true,
      },
      select: {
        id_user: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        store: {
          where: { status: true },
          select: { id_store: true },
        },
        delivery: {
          where: { status: true },
          select: { id_delivery: true },
        },
      },
    });

    if (!user) {
      return next(new UnauthorizedError("Usuario no encontrado"));
    }

    return res.status(200).json({
      success: true,
      user: {
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        id_store: user.store?.id_store ?? null,
        id_delivery: user.delivery?.id_delivery ?? null,
      },
    });
  } catch (error) {
    console.error("[USER_SESSION_ERROR]", error.message);
    next(error);
  }
};