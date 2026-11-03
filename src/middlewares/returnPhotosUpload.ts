import multer from 'multer';
import type { RequestHandler } from 'express';
import { RETURN_PHOTO_MAX_FILES, RETURN_PHOTO_MAX_SIZE } from '../config/uploads.js';
import { AppError } from '../utils/httpError.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: RETURN_PHOTO_MAX_SIZE,
    files: RETURN_PHOTO_MAX_FILES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new AppError(422, 'Format foto tidak didukung', {
          details: { fields: { photos: 'Gunakan foto JPEG, PNG, atau WebP' } },
        }),
      );
      return;
    }

    callback(null, true);
  },
});

const uploadPhotos = upload.array('photos', RETURN_PHOTO_MAX_FILES);

export const returnPhotosUpload: RequestHandler = (req, res, next) => {
  uploadPhotos(req, res, (error: unknown) => {
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
          ? 'Ukuran setiap foto maksimal 5 MB'
          : error.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'Maksimal 5 foto per upload'
            : 'Upload foto tidak valid';

      next(new AppError(422, message, { details: { fields: { photos: message } } }));
      return;
    }

    next(error);
  });
};
