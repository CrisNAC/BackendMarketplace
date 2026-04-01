import * as storeImageService from '../services/store-image.service.js'

export async function getStoreImage(req, res, next) {
  try {
    const logo = await storeImageService.getStoreImage(req.params.id)
    return res.json({ logo })
  } catch (error) {
    next(error)
  }
}

export async function uploadStoreImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const logo = await storeImageService.upsertStoreImage(req.params.id, req.file)
    return res.status(201).json({ logo })
  } catch (error) {
    next(error)
  }
}

export const updateStoreImage = uploadStoreImage

export async function deleteStoreImage(req, res, next) {
  try {
    await storeImageService.removeStoreImage(req.params.id)
    return res.status(200).json({ message: 'Logo eliminado correctamente' })
  } catch (error) {
    next(error)
  }
}