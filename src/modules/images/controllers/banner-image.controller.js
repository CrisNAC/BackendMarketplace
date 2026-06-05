import * as bannerImageService from '../services/banner-image.service.js'

export async function getBannerImage(req, res, next) {
  try {
    const image_url = await bannerImageService.getBannerImage(req.params.id)
    return res.json({ image_url })
  } catch (error) {
    next(error)
  }
}

export async function uploadBannerImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const image_url = await bannerImageService.upsertBannerImage(req.params.id, req.file, req.user)
    return res.status(201).json({ image_url })
  } catch (error) {
    next(error)
  }
}

export async function updateBannerImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const image_url = await bannerImageService.upsertBannerImage(req.params.id, req.file, req.user)
    return res.status(200).json({ image_url })
  } catch (error) {
    next(error)
  }
}

export async function deleteBannerImage(req, res, next) {
  try {
    await bannerImageService.removeBannerImage(req.params.id, req.user)
    return res.status(200).json({ message: 'Imagen eliminada correctamente' })
  } catch (error) {
    next(error)
  }
}
