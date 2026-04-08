import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import authenticate from '../../../config/jwt.config.js'
import { requireRole } from '../../../middlewares/auth.middleware.js'
import {
  getStoreImage,
  uploadStoreImage,
  updateStoreImage,
  deleteStoreImage
} from '../controllers/store-image.controller.js'
import { ROLES } from '../../../utils/contants/roles.constant.js'

const router = Router()

router.get('/:id/image', getStoreImage)
router.post('/:id/image', authenticate, requireRole(ROLES.ADMIN, ROLES.SELLER), upload.single('image'), uploadStoreImage)
router.put('/:id/image', authenticate, requireRole(ROLES.ADMIN, ROLES.SELLER), upload.single('image'), updateStoreImage)
router.delete('/:id/image', authenticate, requireRole(ROLES.ADMIN, ROLES.SELLER), deleteStoreImage)

export default router