import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import authenticate from '../../../config/jwt.config.js'
import {
  getUserImage,
  uploadUserImage,
  updateUserImage,
  deleteUserImage
} from '../controllers/user-image.controller.js'

const router = Router()

router.get('/:id/image', getUserImage)

// Cualquier usuario autenticado puede modificar su propio avatar (ownership en service)
// ADMIN puede modificar cualquiera
router.post('/:id/image', authenticate, upload.single('image'), uploadUserImage)
router.put('/:id/image', authenticate, upload.single('image'), updateUserImage)
router.delete('/:id/image', authenticate, deleteUserImage)

export { router as userImageRoutes }