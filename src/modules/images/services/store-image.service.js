import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from '../../../lib/image.service.js'
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

  try {
    const updated = await prisma.stores.update({
      where: { id_store: Number(id) },
      data: { logo: publicUrl }
    })

    if (oldPath && oldPath !== filePath) await deleteImage(BUCKET, oldPath)

    return updated.logo
  } catch (error) {
    await deleteImage(BUCKET, filePath)
    throw error
  }
}

export async function removeStoreImage(id, user) {
  const store = await prisma.stores.findUnique({
    where: { id_store: Number(id) }
  })
  if (!store) throw new NotFoundError('Comercio no encontrado')

  if (user.role !== ROLES.ADMIN && store.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este comercio')
  }

  if (!store.logo) throw new ValidationError('El comercio no tiene logo')

  const filePath = extractFilePath(store.logo, BUCKET)

  await prisma.stores.update({
    where: { id_store: Number(id) },
    data: { logo: null }
  })

  if (filePath) await deleteImage(BUCKET, filePath)
}