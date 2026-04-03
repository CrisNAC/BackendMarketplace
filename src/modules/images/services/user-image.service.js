import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from '../../../lib/image.service.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors.js'
import { ROLES } from '../../../utils/contants/roles.js'

const BUCKET = process.env.SUPABASE_BUCKET_USERS

export async function getUserImage(id) {
  const user = await prisma.users.findUnique({
    where: { id_user: Number(id) },
    select: { avatar_url: true }
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')
  return user.avatar_url ?? null
}

export async function upsertUserImage(id, file, authUser) {
  const user = await prisma.users.findUnique({
    where: { id_user: Number(id) }
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  if (authUser.role !== ROLES.ADMIN && Number(id) !== authUser.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este avatar')
  }

  const oldPath = user.avatar_url ? extractFilePath(user.avatar_url, BUCKET) : null

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/avatar-${Date.now()}.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  try {
    const updated = await prisma.users.update({
      where: { id_user: Number(id) },
      data: { avatar_url: publicUrl }
    })

    if (oldPath && oldPath !== filePath) await deleteImage(BUCKET, oldPath)

    return updated.avatar_url
  } catch (error) {
    await deleteImage(BUCKET, filePath)
    throw error
  }
}

export async function removeUserImage(id, authUser) {
  const user = await prisma.users.findUnique({
    where: { id_user: Number(id) }
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  if (authUser.role !== ROLES.ADMIN && Number(id) !== authUser.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este avatar')
  }

  if (!user.avatar_url) throw new ValidationError('El usuario no tiene avatar')

  const filePath = extractFilePath(user.avatar_url, BUCKET)
  if (filePath) await deleteImage(BUCKET, filePath)

  await prisma.users.update({
    where: { id_user: Number(id) },
    data: { avatar_url: null }
  })
}