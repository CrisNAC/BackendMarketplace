import { AppError } from "../lib/errors.js";
import { IMAGE } from "../constants/image.constant.js";

/**
 * Middleware global de manejo de errores.
 * Debe registrarse ÚLTIMO en app.js, después de todas las rutas.
 *
 * Captura dos tipos de errores:
 * - AppError (y subclases): errores controlados con mensaje seguro
 * - Error genérico: errores inesperados → devuelve 500 sin exponer detalles internos
 *
 * La respuesta al cliente NUNCA expone stack trace ni detalles internos.
 * Los logs internos pueden incluir stack trace para debug en desarrollo.
 *
 * @example — Uso en un service:
 * import { NotFoundError, ValidationError } from "../../lib/errors.js";
 *
 * if (!product) throw new NotFoundError("Producto no encontrado");
 * if (!name)    throw new ValidationError("name es requerido");
 *
 * @example — Uso en un controller:
 * export const getProduct = async (req, res, next) => {
 *   try {
 *     const product = await getProductService(req.params.id);
 *     return res.status(200).json(product);
 *   } catch (error) {
 *     next(error);
 *   }
 * };
 */
export const errorHandler = (err, req, res, next) => {
  // AppError: errores controlados con mensaje seguro
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.statusCode,
        message: err.message
      }
    });
  }

  // Compatibilidad con objetos planos lanzados como: throw { status: 404, message: "..." }
  const legacyStatusRaw = err?.status ?? err?.statusCode;
  const legacyStatus = Number(legacyStatusRaw);
  if (
    Number.isInteger(legacyStatus) &&
    legacyStatus >= 400 &&
    legacyStatus <= 599 &&
    err?.message
  ) {
    return res.status(legacyStatus).json({
      error: {
        code: legacyStatus,
        message: err.message
      }
    });
  }

  // Errores de multer
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: {
        code: 413,
        message: `Archivo muy grande. Tamaño máximo: ${IMAGE.MAX_SIZE} MB.`
      }
    });
  }

  // Error inesperado: loguear internamente pero NUNCA exponer detalles en respuesta
  console.error(`[ERROR INESPERADO] ${req.method} ${req.path}`, err);

  // Respuesta: SIEMPRE genérica, sin stack trace ni detalles internos
  return res.status(500).json({
    error: {
      code: 500,
      message: "Error interno del servidor"
    }
  });
};