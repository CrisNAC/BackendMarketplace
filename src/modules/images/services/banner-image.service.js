import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from './image.service.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors.js'

const BUCKET = process.env.SUPABASE_BUCKET_BANNERS

export async function getBannerImage(id) {
  const banner = await prisma.banners.findUnique({
    where: { id_banner: Number(id) },
    select: { image_url: true }
  })
  if (!banner) throw new NotFoundError('Solicitud de banner no encontrada')
  return banner.image_url ?? null
}

export async function upsertBannerImage(id, file, user) {
  if (!file?.buffer || !file?.mimetype?.startsWith('image/')) {
    throw new ValidationError('Debés enviar una imagen válida')
  }

  const banner = await prisma.banners.findFirst({
    where: { id_banner: Number(id), status: true },
    select: { id_banner: true, fk_store: true, image_url: true, store: { select: { fk_user: true } } }
  })
  if (!banner) throw new NotFoundError('Solicitud de banner no encontrada')

  if (!banner.fk_store || banner.store?.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar esta solicitud')
  }

  const oldPath = banner.image_url ? extractFilePath(banner.image_url, BUCKET) : null

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/image-${Date.now()}.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  let updated
  try {
    updated = await prisma.banners.update({
      where: { id_banner: Number(id) },
      data: { image_url: publicUrl }
    })
  } catch (error) {
    await deleteImage(BUCKET, filePath).catch(() => {})
    throw error
  }

  if (oldPath && oldPath !== filePath) {
    await deleteImage(BUCKET, oldPath).catch(() => {})
  }

  return updated.image_url
}

export async function removeBannerImage(id, user) {
  const banner = await prisma.banners.findFirst({
    where: { id_banner: Number(id), status: true },
    select: { id_banner: true, fk_store: true, image_url: true, store: { select: { fk_user: true } } }
  })
  if (!banner) throw new NotFoundError('Solicitud de banner no encontrada')

  if (!banner.fk_store || banner.store?.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar esta solicitud')
  }

  if (!banner.image_url) throw new NotFoundError('La solicitud no tiene imagen')

  const filePath = extractFilePath(banner.image_url, BUCKET)

  await prisma.banners.update({
    where: { id_banner: Number(id) },
    data: { image_url: null }
  })

  if (filePath) await deleteImage(BUCKET, filePath)
}
