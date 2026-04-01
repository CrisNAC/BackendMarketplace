import * as productImageService from '../services/product-image.service.js'

export async function getProductImage(req, res, next) {
  try {
    const image_url = await productImageService.getProductImage(req.params.id)
    return res.json({ image_url })
  } catch (error) {
    next(error)
  }
}

export async function uploadProductImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const image_url = await productImageService.upsertProductImage(req.params.id, req.file)
    return res.status(201).json({ image_url })
  } catch (error) {
    next(error)
  }
}

export const updateProductImage = uploadProductImage

export async function deleteProductImage(req, res, next) {
  try {
    await productImageService.removeProductImage(req.params.id)
    return res.status(200).json({ message: 'Imagen eliminada correctamente' })
  } catch (error) {
    next(error)
  }
}