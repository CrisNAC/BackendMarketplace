import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  prisma,
  verifyPassword,
  UnauthorizedError,
  ValidationError,
  addToBlacklist,
  cleanExpiredTokens,
} from "../../../lib/index.js";
import { logSecurityEvent } from "../../../lib/security-logger.js";

dotenv.config();

/**
 * POST /api/session
 * Inicia sesión con email y contraseña.
 * 
 * - NO loguea ni expone la contraseña
 * - Compara con bcrypt de forma segura
 * - Genera JWT con expiración de 30 minutos
 * - Establece cookie httpOnly y segura
 * 
 * @throws {ValidationError} Email o password faltantes
 * @throws {UnauthorizedError} Credenciales inválidas o error técnico
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logSecurityEvent("LOGIN_FAILED", {
        reason: "missing_credentials",
        email: email ?? null,
      });
      return next(new ValidationError("Debe ingresar email y contraseña"));
    }

    const user = await prisma.users.findFirst({
      where: {
        email,
        status: true,
      },
    });

    if (!user) {
      logSecurityEvent("LOGIN_FAILED", {
        reason: "invalid_credentials",
        email,
      });
      return next(new UnauthorizedError("Credenciales inválidas"));
    }

    let passwordMatch;
    try {
      passwordMatch = await verifyPassword(password, user.password_hash);
    } catch {
      return next(new UnauthorizedError("Credenciales inválidas"));
    }

    if (!passwordMatch) {
      logSecurityEvent("LOGIN_FAILED", {
        reason: "invalid_credentials",
        email,
      });
      return next(new UnauthorizedError("Credenciales inválidas"));
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.cookie("userToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 30 * 60 * 1000,
      path: "/",
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
    next(error);
  }
};

/**
 * DELETE /api/session
 * Cierra sesión eliminando la cookie de autenticación del cliente.
 * 
 * La cookie se limpia con opciones idénticas a la creación para
 * asegurar que el navegador la elimine correctamente.
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.userToken;

    if (token) {
      addToBlacklist(token);
      cleanExpiredTokens((t) => {
        try {
          jwt.verify(t, process.env.JWT_SECRET);
          return false;
        } catch {
          return true;
        }
      });
    }

    res.clearCookie("userToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Sesión cerrada correctamente",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/session/user-session
 * Obtiene los datos de la sesión activa desde el JWT en cookie.
 * 
 * - Verifica que el token JWT sea válido y no esté expirado
 * - Retorna datos mínimos del usuario (nunca password)
 * - Incluye asociaciones del usuario (store, delivery)
 * 
 * @returns {Object} Datos del usuario autenticado
 */
export const userSession = async (req, res, next) => {
  try {
    const token = req.cookies.userToken;

    if (!token) {
      return next(new UnauthorizedError("No autenticado"));
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return next(new UnauthorizedError("Token expirado"));
      }
      return next(new UnauthorizedError("Token inválido"));
    }

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
    next(error);
  }
};