import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

let supabase

export function getSupabase() {
  if (supabase) return supabase

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  }

  supabase = createClient(url, serviceRoleKey)
  return supabase
}