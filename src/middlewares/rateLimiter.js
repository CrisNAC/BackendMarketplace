import { rateLimit } from 'express-rate-limit';

const jsonResponse = (message) => ({
  success: false,
  message,
});

// Login: 5 intentos por IP cada 15 minutos
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: jsonResponse(
    'Demasiados intentos de inicio de sesión. Esperá 15 minutos e intentá de nuevo.'
  ),
});

// Recuperar contraseña: 3 solicitudes por IP cada hora
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: jsonResponse(
    'Demasiadas solicitudes de recuperación de contraseña. Esperá 1 hora e intentá de nuevo.'
  ),
});
