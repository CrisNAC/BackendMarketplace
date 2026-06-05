import path from 'node:path'
import multer from 'multer'
import { ValidationError } from '../lib/errors.js'
import { IMAGE } from '../constants/image.constant.js'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE.MAX_SIZE_MB() },
  fileFilter: (req, file, cb) => {
    if (!IMAGE.ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new ValidationError('Formato no permitido. Usá JPG, PNG o WEBP.'))
    }

    const ext = path.extname(file.originalname).toLowerCase()
    if (!IMAGE.ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new ValidationError('Extensión no permitida. Usá .jpg, .jpeg, .png o .webp.'))
    }

    cb(null, true)
  }
})