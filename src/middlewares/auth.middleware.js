import { ForbiddenError } from '../lib/errors.js'

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS de authenticate.
 * @param {...string} roles - Roles permitidos (ej: 'ADMIN', 'SELLER')
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ForbiddenError('No tenés permisos para realizar esta acción'))
  }
  next()
}