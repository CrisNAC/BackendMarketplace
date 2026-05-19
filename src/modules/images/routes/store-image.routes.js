import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import authenticate from '../../../config/jwt.config.js'
import {
  getStoreImage,
  uploadStoreImage,
  updateStoreImage,
  deleteStoreImage
} from '../controllers/store-image.controller.js'

const router = Router()

router.get('/:id/image', getStoreImage)
// El service valida ownership/admin. Esto permite subir el logo justo despues
// de crear el comercio, aunque el JWT todavia tenga el rol anterior.
router.post('/:id/image', authenticate, upload.single('image'), uploadStoreImage)
router.put('/:id/image', authenticate, upload.single('image'), updateStoreImage)
router.delete('/:id/image', authenticate, deleteStoreImage)

export { router as storeImageRoutes }
