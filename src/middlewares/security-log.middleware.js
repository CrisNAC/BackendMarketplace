import { logSecurityEvent } from "../lib/security-logger.js";

/**
 * Registra respuestas HTTP 403 al finalizar la petición (cubre AppError y errores legacy en controllers).
 */
export const securityResponseLogger = (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode !== 403) return;

    logSecurityEvent("FORBIDDEN", {
      method: req.method,
      path: req.originalUrl || req.path,
      userId: req.user?.id_user ?? null,
      role: req.user?.role ?? null,
    });
  });

  next();
};
