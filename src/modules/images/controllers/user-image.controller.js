import * as userImageService from '../services/user-image.service.js'

export async function getUserImage(req, res, next) {
  try {
    const avatar_url = await userImageService.getUserImage(req.params.id)
    return res.json({ avatar_url })
  } catch (error) {
    next(error)
  }
}

export async function uploadUserImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const avatar_url = await userImageService.upsertUserImage(req.params.id, req.file)
    return res.status(201).json({ avatar_url })
  } catch (error) {
    next(error)
  }
}

export const updateUserImage = uploadUserImage

export async function deleteUserImage(req, res, next) {
  try {
    await userImageService.removeUserImage(req.params.id)
    return res.status(200).json({ message: 'Avatar eliminado correctamente' })
  } catch (error) {
    next(error)
  }
}