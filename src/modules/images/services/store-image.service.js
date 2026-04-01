import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from './image.service.js'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'

const BUCKET = process.env.SUPABASE_BUCKET_STORES

export async function getStoreImage(id) {
  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) },
    select: { logo: true }
  })
  if (!store) throw new NotFoundError('Tienda no encontrada')
  return store.logo ?? null
}

export async function upsertStoreImage(id, file) {
  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) }
  })
  if (!store) throw new NotFoundError('Tienda no encontrada')

  if (store.logo) {
    const oldPath = extractFilePath(store.logo, BUCKET)
    if (oldPath) await deleteImage(BUCKET, oldPath)
  }

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/logo.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  const updated = await prisma.stores.update({
    where: { id_store: Number(id) },
    data: { logo: publicUrl }
  })

  return updated.logo
}

export async function removeStoreImage(id) {
  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) }
  })
  if (!store) throw new NotFoundError('Tienda no encontrada')
  if (!store.logo) throw new ValidationError('Tienda sin logo')

  const filePath = extractFilePath(store.logo, BUCKET)
  if (filePath) await deleteImage(BUCKET, filePath)

  await prisma.stores.update({
    where: { id_store: Number(id) },
    data: { logo: null }
  })
}