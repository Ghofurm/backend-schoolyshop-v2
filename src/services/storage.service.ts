import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { UPLOAD_DIR } from '../config/uploads.js';
import { AppError } from '../utils/httpError.js';

const s3Enabled = Boolean(
  env.S3_ENDPOINT &&
    env.S3_BUCKET &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY,
);

const s3Client = s3Enabled
  ? new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })
  : null;

// shortcut: public bucket without a CDN; egress is billed as traffic grows.
function publicUrl(key: string): string {
  return `${env.S3_ENDPOINT.replace(/\/+$/, '')}/${env.S3_BUCKET}/${key}`;
}

export async function storeUpload(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      return publicUrl(params.key);
    } catch {
      throw new AppError(502, 'Penyimpanan file sedang tidak tersedia', { code: 'SERVER' });
    }
  }

  const localPath = path.join(UPLOAD_DIR, params.key);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, params.body);

  return `/uploads/${params.key}`;
}
