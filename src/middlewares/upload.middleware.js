import multer from 'multer'
import { ValidationError } from '../lib/errors.js'
import { IMAGE } from '../utils/contants/image.constant.js'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE.MAX_SIZE_MB },
  fileFilter: (req, file, cb) => {
    if (IMAGE.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new ValidationError('Formato no permitido. Usá JPG, PNG o WEBP.'))
    }
  }
})