import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import authenticate from '../../../config/jwt.config.js'
import { requireRole } from '../../../middlewares/auth.middleware.js'
import {
  getProductImage,
  uploadProductImage,
  updateProductImage,
  deleteProductImage
} from '../controllers/product-image.controller.js'
import { ROLES } from '../../../utils/contants/roles.constant.js'

const router = Router()

// GET — público
router.get('/:id/image', getProductImage)

// POST, PUT, DELETE — solo ADMIN o SELLER (ownership se verifica en el service)
router.post('/:id/image', authenticate, requireRole(ROLES.ADMIN, ROLES.SELLER), upload.single('image'), uploadProductImage)
router.put('/:id/image', authenticate, requireRole(ROLES.ADMIN, ROLES.SELLER), upload.single('image'), updateProductImage)
router.delete('/:id/image', authenticate, requireRole(ROLES.ADMIN, ROLES.SELLER), deleteProductImage)

export { router as productImageRoutes }