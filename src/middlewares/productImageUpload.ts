import multer from 'multer';
import type { RequestHandler } from 'express';
import { PRODUCT_IMAGE_MAX_SIZE } from '../config/uploads.js';
import { AppError } from '../utils/httpError.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new AppError(422, 'Format gambar tidak didukung', {
          details: { fields: { image: 'Gunakan gambar JPEG, PNG, atau WebP' } },
        }),
      );
      return;
    }

    callback(null, true);
  },
});

const uploadImage = upload.single('image');

export const productImageUpload: RequestHandler = (req, res, next) => {
  uploadImage(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Ukuran gambar maksimal 5 MB'
          : 'Upload gambar tidak valid';

      next(new AppError(422, message, { details: { fields: { image: message } } }));
      return;
    }

    next(error);
  });
};
