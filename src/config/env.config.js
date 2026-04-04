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

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Faltan las siguientes variables de entorno:')
    missing.forEach(key => console.error(`   - ${key}`))
    process.exit(1)
  }

  console.log('✅ Variables de entorno validadas correctamente')
}