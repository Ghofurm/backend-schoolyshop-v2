import path from 'node:path';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
export const RETURN_UPLOAD_DIR = path.join(UPLOAD_DIR, 'returns');
export const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_DIR, 'products');
export const RETURN_PHOTO_MAX_FILES = 5;
export const RETURN_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
