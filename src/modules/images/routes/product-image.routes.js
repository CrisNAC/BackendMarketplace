import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import {
  getProductImage,
  uploadProductImage,
  updateProductImage,
  deleteProductImage
} from '../controllers/product-image.controller.js'

const router = Router()

router.get('/:id/image', getProductImage)
router.post('/:id/image', upload.single('image'), uploadProductImage)
router.put('/:id/image', upload.single('image'), updateProductImage)
router.delete('/:id/image', deleteProductImage)

export default router