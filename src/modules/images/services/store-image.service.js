import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from './image.service.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors.js'
import { ROLES } from '../../../utils/contants/roles.constant.js'

const BUCKET = process.env.SUPABASE_BUCKET_STORES

export async function getStoreImage(id) {
  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) },
    select: { logo: true }
  })
  if (!store) throw new NotFoundError('Comercio no encontrado')
  return store.logo ?? null
}

export async function upsertStoreImage(id, file, user) {
  if (!file?.buffer || !file?.mimetype?.startsWith('image/')) {
    throw new ValidationError('Debés enviar una imagen válida')
  }

  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) }
  })
  if (!store) throw new NotFoundError('Comercio no encontrado')

  if (user.role !== ROLES.ADMIN && store.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este comercio')
  }

  const oldPath = store.logo ? extractFilePath(store.logo, BUCKET) : null

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/logo-${Date.now()}.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  let updated
  try {
    updated = await prisma.stores.update({  
      where: { id_store: Number(id) },      
      data: { logo: publicUrl }             
    })
  } catch (error) {
    // Solo borramos la nueva imagen si la BD NO se actualizó
    await deleteImage(BUCKET, filePath).catch(() => { })
    throw error
  }

  if (oldPath && oldPath !== filePath) {
    try {
      await deleteImage(BUCKET, oldPath)
    } catch (cleanupError) {
      // El nuevo logo ya está guardado en BD, solo logueamos el fallo de limpieza
      console.warn(`[WARN] No se pudo eliminar imagen antigua: ${oldPath}`, cleanupError)
    }
  }

  return updated.logo 
}

export async function removeStoreImage(id, user) {
  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) }
  })
  if (!store) throw new NotFoundError('Comercio no encontrado')

  if (user.role !== ROLES.ADMIN && store.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este comercio')
  }

  if (!store.logo) throw new NotFoundError('El comercio no tiene logo')

  const filePath = extractFilePath(store.logo, BUCKET)

  await prisma.stores.update({
    where: { id_store: Number(id) },
    data: { logo: null }
  })

  if (filePath) {
    await deleteImage(BUCKET, filePath).catch((cleanupError) => {
      console.warn(`[WARN] No se pudo eliminar logo en storage: ${filePath}`, cleanupError)
    })
  }
}