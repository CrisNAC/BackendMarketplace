import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from './image.service.js'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'

const BUCKET = process.env.SUPABASE_BUCKET_USERS

export async function getUserImage(id) {
  const user = await prisma.users.findUnique({
    where: { id_user: Number(id) },
    select: { avatar_url: true }
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')
  return user.avatar_url ?? null
}

export async function upsertUserImage(id, file) {
  const user = await prisma.users.findUnique({
    where: { id_user: Number(id) }
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  if (user.avatar_url) {
    const oldPath = extractFilePath(user.avatar_url, BUCKET)
    if (oldPath) await deleteImage(BUCKET, oldPath)
  }

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/avatar.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  const updated = await prisma.users.update({
    where: { id_user: Number(id) },
    data: { avatar_url: publicUrl }
  })

  return updated.avatar_url
}

export async function removeUserImage(id) {
  const user = await prisma.users.findUnique({
    where: { id_user: Number(id) }
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')
  if (!user.avatar_url) throw new ValidationError('Usuario sin avatar')

  const filePath = extractFilePath(user.avatar_url, BUCKET)
  if (filePath) await deleteImage(BUCKET, filePath)

  await prisma.users.update({
    where: { id_user: Number(id) },
    data: { avatar_url: null }
  })
}