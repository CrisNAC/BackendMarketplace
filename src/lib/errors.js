/**
 * Clase base para todos los errores de la aplicación.
 * Extender esta clase para crear errores específicos.
 *
 * @example
 * throw new NotFoundError("Producto no encontrado");
 * throw new ValidationError("El precio debe ser mayor a 0");
 */
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

/** 400 — Datos inválidos o faltantes en el request */
export class ValidationError extends AppError {
  constructor(message = "Datos inválidos") {
    super(400, message);
  }
}

/** 401 — El usuario no está autenticado */
export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(401, message);
  }
}

/** 403 — El usuario no tiene permisos para realizar la acción */
export class ForbiddenError extends AppError {
  constructor(message = "No tienes permisos para realizar esta acción") {
    super(403, message);
  }
}

/** 404 — El recurso solicitado no existe */
export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(404, message);
  }
}

/** 409 — Conflicto, por ejemplo un recurso duplicado */
export class ConflictError extends AppError {
  constructor(message = "El recurso ya existe") {
    super(409, message);
  }
}
