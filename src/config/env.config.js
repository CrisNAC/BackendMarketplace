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
 */
function validateSecretStrength(secret, name) {
  const isProduction = process.env.NODE_ENV === 'production'
  const minLength = isProduction ? 32 : 16

  if (secret.length < minLength) {
    console.warn(
      `  ${name} es débil (${secret.length} chars, mín ${minLength} recomendado en ${isProduction ? 'producción' : 'desarrollo'})`
    )
    if (isProduction) {
      throw new Error(`${name} debe tener mínimo ${minLength} caracteres en producción`)
    }
  }
}

export function validateEnv() {
  // 1. Validar que todas las vars existan
  const missing = requiredEnvVars.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error(' Faltan las siguientes variables de entorno:')
    missing.forEach(key => console.error(`   - ${key}`))
    process.exit(1)
  }

  // 2. Validar fortaleza de secretos críticos
  try {
    validateSecretStrength(process.env.JWT_SECRET, 'JWT_SECRET')
    validateSecretStrength(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY')
  } catch (error) {
    console.error(` ${error.message}`)
    process.exit(1)
  }

  console.log(' Variables de entorno validadas correctamente')
}