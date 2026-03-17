import { AppError } from "../lib/errors.js";

/**
 * Middleware global de manejo de errores.
 * Debe registrarse ÚLTIMO en index.js, después de todas las rutas.
 *
 * Captura dos tipos de errores:
 * - AppError (y subclases): errores controlados lanzados desde services/controllers
 * - Error genérico: errores inesperados → devuelve 500 sin exponer detalles internos
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
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.statusCode,
        message: err.message
      }
    });
  }

  // Compatibilidad con objetos planos lanzados como: throw { status: 404, message: "..." }
  const legacyStatus = err?.status || err?.statusCode;
  if (legacyStatus && err?.message) {
    return res.status(legacyStatus).json({
      error: {
        code: legacyStatus,
        message: err.message
      }
    });
  }

  // Error inesperado — loguear internamente pero no exponer detalles al cliente
  console.error(`[ERROR INESPERADO] ${req.method} ${req.path}`, err);

  return res.status(500).json({
    error: {
      code: 500,
      message: "Error interno del servidor"
    }
  });
};
