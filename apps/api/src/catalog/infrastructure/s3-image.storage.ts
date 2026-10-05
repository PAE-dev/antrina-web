import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  type ImageContentType,
  type ImageStorage,
  type ImageUploadTarget,
  type StoredObject,
} from '@antrina/domain';
import { type S3Env } from '../../config/env.js';

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const EXTENSIONS: Record<ImageContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Almacenamiento S3-compatible: MinIO en local y Cloudflare R2 en producción
 * (mismo código, distintas variables S3_*). Las claves son inmutables: cada subida crea una nueva.
 */
export class S3ImageStorage implements ImageStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3Env) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Sin checksums automáticos: el navegador no puede calcularlos en un PUT firmado.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  publicUrl(storageKey: string): string {
    return `${this.config.publicUrl}/${storageKey}`;
  }

  async createUploadTarget(input: {
    prefix: string;
    contentType: ImageContentType;
    sizeBytes: number;
  }): Promise<ImageUploadTarget> {
    const storageKey = `${input.prefix}/${randomUUID()}.${EXTENSIONS[input.contentType]}`;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      ContentType: input.contentType,
      CacheControl: CACHE_CONTROL,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type', 'cache-control']),
    });
    return {
      storageKey,
      uploadUrl,
      headers: { 'Content-Type': input.contentType, 'Cache-Control': CACHE_CONTROL },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
    };
  }

  async stat(storageKey: string): Promise<StoredObject | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: storageKey }),
      );
      return { sizeBytes: head.ContentLength ?? 0, contentType: head.ContentType ?? '' };
    } catch (error) {
      if (error instanceof NotFound || (error as { name?: string }).name === 'NotFound')
        return null;
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: storageKey }),
    );
  }
}
