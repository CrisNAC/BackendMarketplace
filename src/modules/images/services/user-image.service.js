import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from '../../../lib/image.service.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors.js'
import { ROLES } from '../../../utils/contants/roles.constant.js'

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
  if (!file?.buffer || !file?.mimetype?.startsWith('image/')) {
    throw new ValidationError('Debés enviar una imagen válida')
  }

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

  let updated
  try {
    updated = await prisma.users.update({
      where: { id_user: Number(id) },
      data: { avatar_url: publicUrl }
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
      // El nuevo avatar ya está guardado en BD, solo logueamos el fallo de limpieza
      console.warn(`[WARN] No se pudo eliminar imagen antigua: ${oldPath}`, cleanupError)
    }
  }

  return updated.avatar_url
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

  await prisma.users.update({
    where: { id_user: Number(id) },
    data: { avatar_url: null }
  })

  if (filePath) await deleteImage(BUCKET, filePath)
}