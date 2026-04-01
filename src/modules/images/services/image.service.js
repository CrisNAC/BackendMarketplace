import { supabase } from '../../../config/supabase.config.js'

/**
 * Sube un archivo a Supabase Storage y devuelve la URL pública.
 * @param {Buffer} buffer - Contenido del archivo
 * @param {string} bucket - Nombre del bucket
 * @param {string} filePath - Ruta dentro del bucket (ej: "123/avatar.jpg")
 * @param {string} mimeType - MIME type del archivo
 */
export async function uploadImage(buffer, bucket, filePath, mimeType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true // sobreescribe si ya existe (útil para PUT)
    })

  if (error) throw new Error(`Error al subir imagen: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Elimina un archivo de Supabase Storage.
 * @param {string} bucket
 * @param {string} filePath
 */
export async function deleteImage(bucket, filePath) {
  const { error } = await supabase.storage.from(bucket).remove([filePath])
  if (error) throw new Error(`Error al eliminar imagen: ${error.message}`)
}

/**
 * Extrae el filePath relativo desde una URL pública de Supabase.
 * Ej: "https://xxx.supabase.co/storage/v1/object/public/product-images/42/img.jpg"
 * → "42/img.jpg"
 */
export function extractFilePath(publicUrl, bucket) {
  const marker = `/object/public/${bucket}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}