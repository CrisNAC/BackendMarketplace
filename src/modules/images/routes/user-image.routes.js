import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import {
  getUserImage,
  uploadUserImage,
  updateUserImage,
  deleteUserImage
} from '../controllers/user-image.controller.js'

const router = Router()

router.get('/:id/image', getUserImage)
router.post('/:id/image', upload.single('image'), uploadUserImage)
router.put('/:id/image', upload.single('image'), updateUserImage)
router.delete('/:id/image', deleteUserImage)

export default router