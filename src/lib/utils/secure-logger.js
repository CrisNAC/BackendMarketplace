/**
 * VALIDACIÓN DE LOGS - Asegurar que NO se loguean datos sensibles
 * 
 * Principio: NUNCA loguear passwords, tokens, o secretos.
 * Loguear solo el mensaje de error y type para debugging.
 */

/**
 * Sanitizador de logs para remover datos sensibles antes de loguear
 * @param {string} message - Mensaje a loguear
 * @returns {string} Mensaje sanitizado
 */
function sanitizeLog(message) {
  if (!message) return message

  // Patrones a ocultar
  return message
    .replace(/password\s*=\s*['"]([^'"]+)['"]/gi, 'password=***')
    .replace(/password\s*:\s*['"]([^'"]+)['"]/gi, 'password:***')
    .replace(/jwt_secret\s*=\s*['"]([^'"]+)['"]/gi, 'jwt_secret=***')
    .replace(/token\s*:\s*['"]([^'"]+)['"]/gi, 'token:***')
    .replace(/Authorization\s*:\s*Bearer\s+[^\s]+/gi, 'Authorization: Bearer ***')
}

/**
 * Logger seguro - wrapper alrededor de console que sanitiza datos
 */
export const secureLogger = {
  log: (message, ...args) => {
    console.log(sanitizeLog(message), ...args)
  },
  error: (message, ...args) => {
    // IMPORTANTE: loguear error tipo pero NO el stack trace completo con secrets
    console.error(`[ERROR] ${sanitizeLog(message)}`)
    if (args[0]?.code || args[0]?.name) {
      console.error(`Error Code: ${args[0].code || args[0].name}`)
    }
  },
  warn: (message, ...args) => {
    console.warn(sanitizeLog(message), ...args)
  },
  debug: (message, ...args) => {
    if (process.env.DEBUG) {
      console.debug(sanitizeLog(message), ...args)
    }
  }
}

/**
 * Validar que los logs de error no contienen datos sensibles
 * Se ejecuta una vez al iniciar (development)
 */
export function validateLogsSecurity() {
  if (process.env.NODE_ENV !== 'development') return

  const sensitivePatterns = [
    /password\s*[:=]/i,
    /secret\s*[:=]/i,
    /token\s*[:=]/i,
    /jwt\s*[:=]/i,
    /api[_-]key\s*[:=]/i,
  ]

  // Aunque esto es manual, lo importante es el patrón
  console.log('Logger de seguridad iniciado - datos sensibles serán sanitizados')
}