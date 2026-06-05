const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_BUCKET_PRODUCTS',
  'SUPABASE_BUCKET_USERS',
  'SUPABASE_BUCKET_STORES',
]

/**
 * Valida que los secretos cumplan requisitos mínimos de seguridad.
 * En desarrollo permite valores cortos, en producción exige mínimo 32 caracteres.
 * 
 * - Rechaza secretos vacíos o solo whitespace
 * - Valida longitud mínima
 * - Advierte en desarrollo, falla en producción
 */
function validateSecretStrength(secret, name) {
  const isProduction = process.env.NODE_ENV === 'production'
  const minLength = isProduction ? 32 : 16

  // Validar que no sea solo whitespace o vacío
  const trimmed = secret.trim()
  if (!trimmed || trimmed.length === 0) {
    throw new Error(`${name} no puede estar vacío o contener solo espacios`)
  }

  // Validar longitud mínima del valor real (sin espacios)
  if (trimmed.length < minLength) {
    const env = isProduction ? 'producción' : 'desarrollo'
    console.warn(`[WARNING] ${name} es débil (${trimmed.length} chars, mín ${minLength} en ${env})`)
    
    if (isProduction) {
      throw new Error(`${name} debe tener mínimo ${minLength} caracteres en producción`)
    }
  }
}

/**
 * Valida todas las variables de entorno requeridas.
 * 
 * 1. Verifica que todas las vars obligatorias existan
 * 2. Valida fortaleza de secrets críticos (JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY)
 * 3. Falla al iniciar si hay problemas en producción
 */
export function validateEnv() {
  // 1. Validar que todas las vars existan
  const missing = requiredEnvVars.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error('[ERROR] Faltan las siguientes variables de entorno:')
    missing.forEach(key => console.error(`   - ${key}`))
    process.exit(1)
  }

  // 2. Validar fortaleza de secretos críticos
  try {
    validateSecretStrength(process.env.JWT_SECRET, 'JWT_SECRET')
    validateSecretStrength(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY')
  } catch (error) {
    console.error(`[ERROR] ${error.message}`)
    process.exit(1)
  }

  console.log('[OK] Variables de entorno validadas correctamente')
}