import { Router } from 'express'
import { upload } from '../../../middlewares/upload.middleware.js'
import authenticate from '../../../config/jwt.config.js'
import { requireRole } from '../../../middlewares/auth.middleware.js'
import {
  getBannerImage,
  uploadBannerImage,
  updateBannerImage,
  deleteBannerImage
} from '../controllers/banner-image.controller.js'
import { ROLES } from '../../../constants/roles.constant.js'

const router = Router()

router.get('/:id/image', getBannerImage)
router.post('/:id/image', authenticate, requireRole(ROLES.SELLER), upload.single('image'), uploadBannerImage)
router.put('/:id/image', authenticate, requireRole(ROLES.SELLER), upload.single('image'), updateBannerImage)
router.delete('/:id/image', authenticate, requireRole(ROLES.SELLER), deleteBannerImage)

export { router as bannerImageRoutes }
