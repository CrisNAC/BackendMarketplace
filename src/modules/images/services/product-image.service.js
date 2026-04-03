import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from '../../../lib/image.service.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors.js'
import { ROLES } from '../../../utils/contants/roles.constant.js'

const BUCKET = process.env.SUPABASE_BUCKET_PRODUCTS

export async function getProductImage(id) {
  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) },
    select: { image_url: true }
  })
  if (!product) throw new NotFoundError('Producto no encontrado')
  return product.image_url ?? null
}

export async function upsertProductImage(id, file, user) {
  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) },
    include: { store: true }
  })
  if (!product) throw new NotFoundError('Producto no encontrado')

  // ADMIN puede todo, SELLER solo sus propios productos
  if (user.role !== ROLES.ADMIN && product.store.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este producto')
  }

  const oldPath = product.image_url ? extractFilePath(product.image_url, BUCKET) : null

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/image-${Date.now()}.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  try {
    const updated = await prisma.products.update({
      where: { id_product: Number(id) },
      data: { image_url: publicUrl }
    })

    if (oldPath && oldPath !== filePath) await deleteImage(BUCKET, oldPath)

    return updated.image_url
  } catch (error) {
    // Si el update de BD falla, borramos la imagen recién subida para evitar archivos huérfanos
    await deleteImage(BUCKET, filePath)
    throw error
  }
}

export async function removeProductImage(id, user) {
  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) },
    include: { store: true }
  })
  if (!product) throw new NotFoundError('Producto no encontrado')

  if (user.role !== ROLES.ADMIN && product.store.fk_user !== user.id_user) {
    throw new ForbiddenError('No tenés permisos para modificar este producto')
  }

  if (!product.image_url) throw new ValidationError('El producto no tiene imagen')

  const filePath = extractFilePath(product.image_url, BUCKET)

  await prisma.products.update({
    where: { id_product: Number(id) },
    data: { image_url: null }
  })

  if (filePath) await deleteImage(BUCKET, filePath)
}