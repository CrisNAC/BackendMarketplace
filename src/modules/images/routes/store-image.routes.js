import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import {
  getStoreImage,
  uploadStoreImage,
  updateStoreImage,
  deleteStoreImage
} from '../controllers/store-image.controller.js'

const router = Router()

router.get('/:id/image', getStoreImage)
router.post('/:id/image', upload.single('image'), uploadStoreImage)
router.put('/:id/image', upload.single('image'), updateStoreImage)
router.delete('/:id/image', deleteStoreImage)

export default router