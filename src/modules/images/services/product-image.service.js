import { prisma } from '../../../lib/prisma.js'
import { uploadImage, deleteImage, extractFilePath } from './image.service.js'
import { NotFoundError, ValidationError } from '../../../lib/errors.js'

const BUCKET = process.env.SUPABASE_BUCKET_PRODUCTS

export async function getProductImage(id) {
  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) },
    select: { image_url: true }
  })
  if (!product) throw new NotFoundError('Producto no encontrado')
  return product.image_url ?? null
}

export async function upsertProductImage(id, file) {
  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) }
  })
  if (!product) throw new NotFoundError('Producto no encontrado')

  if (product.image_url) {
    const oldPath = extractFilePath(product.image_url, BUCKET)
    if (oldPath) await deleteImage(BUCKET, oldPath)
  }

  const ext = file.mimetype.split('/')[1]
  const filePath = `${id}/image.${ext}`
  const publicUrl = await uploadImage(file.buffer, BUCKET, filePath, file.mimetype)

  const updated = await prisma.products.update({
    where: { id_product: Number(id) },
    data: { image_url: publicUrl }
  })

  return updated.image_url
}

export async function removeProductImage(id) {
  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) }
  })
  if (!product) throw new NotFoundError('Producto no encontrado')
  if (!product.image_url) throw new ValidationError('Producto sin imagen')

  const filePath = extractFilePath(product.image_url, BUCKET)
  if (filePath) await deleteImage(BUCKET, filePath)

  await prisma.products.update({
    where: { id_product: Number(id) },
    data: { image_url: null }
  })
}