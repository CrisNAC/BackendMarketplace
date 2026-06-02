import bcrypt from 'bcrypt'

/**
 * Coste de bcrypt adaptado al ambiente:
 * - Desarrollo: 10 (rápido para testing)
 * - Producción: 12 (más seguro, ~100ms por hash)
 * 
 * En 2025 se recomienda 12+, pero el hardware del servidor define el máximo
 * antes de timeouts (típicamente 100-200ms).
 */
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'production' ? 12 : 10

/**
 * Hash de contraseña con bcrypt.
 * NUNCA devuelve la contraseña en claro.
 * 
 * @param {string} plainPassword - Contraseña sin hashear
 * @returns {Promise<string>} Hash bcrypt seguro
 * @throws {Error} Si la contraseña es inválida o el hash falla
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('La contraseña debe ser un string no vacío')
  }

  if (plainPassword.length < 6) {
    throw new Error('La contraseña debe tener mínimo 6 caracteres')
  }

  try {
    return await bcrypt.hash(plainPassword, BCRYPT_ROUNDS)
  } catch (error) {
    throw new Error('Error al procesar la contraseña')
  }
}

/**
 * Compara contraseña en claro con hash bcrypt.
 * NUNCA loguea la contraseña.
 * 
 * Retorna false en dos casos:
 * - La contraseña no coincide con el hash (mismatch)
 * - Hay un error técnico en bcrypt (hash corrupto, etc)
 * 
 * El cliente no puede distinguir entre ambos casos, lo cual es intencional
 * para no revelar si hay un problema en el servidor.
 * 
 * @param {string} plainPassword - Contraseña ingresada por el usuario
 * @param {string} hashedPassword - Hash almacenado en BD
 * @returns {Promise<boolean>} true si coincide, false si no coincide o hay error
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false
  }

  try {
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (error) {
    return false
  }
}