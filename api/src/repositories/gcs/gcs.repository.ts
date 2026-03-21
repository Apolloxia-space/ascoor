import { Storage } from '@google-cloud/storage';
import type { IGcsRepository } from '../interfaces';
import type { GeneratedDesignInfo } from '../../entities/designs';
import type { UploadedObjectInfo } from '../../entities/storage';

export interface GcsRepositoryOptions {
  bucket: string;
}

export class GcsRepository implements IGcsRepository {
  private readonly storage: Storage;

  constructor(private readonly options: GcsRepositoryOptions) {
    this.storage = new Storage(); // ADC will pick up credentials
  }

  async upload(params: {
    content: string;
    contentType: string;
    metadata?: Record<string, string>;
    objectPath?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<GeneratedDesignInfo> {
    const { objectPath, userId, filename, ext, content, contentType, metadata } = params;
    const resolvedPath =
      objectPath ??
      (() => {
        if (!userId || !filename || !ext) {
          throw new Error('objectPath or (userId, filename, ext) must be provided');
        }
        return `${userId}/${filename}.${ext}`;
      })();
    const bucket = this.storage.bucket(this.options.bucket);
    const file = bucket.file(resolvedPath);
    await file.save(content, {
      contentType,
      resumable: false,
      ...(metadata ? { metadata: { metadata } } : {}),
    });

    const gcsUri = `gs://${this.options.bucket}/${resolvedPath}`;
    return {
      bucket: this.options.bucket,
      filename: resolvedPath,
      gcsUri,
      content,
    };
  }

  async uploadBinary(params: {
    content: Uint8Array;
    contentType: string;
    metadata?: Record<string, string>;
    objectPath: string;
  }): Promise<UploadedObjectInfo> {
    const { objectPath, content, contentType, metadata } = params;
    const bucket = this.storage.bucket(this.options.bucket);
    const file = bucket.file(objectPath);
    await file.save(content, {
      contentType,
      resumable: false,
      ...(metadata ? { metadata: { metadata } } : {}),
    });

    const gcsUri = `gs://${this.options.bucket}/${objectPath}`;
    return {
      bucket: this.options.bucket,
      objectPath,
      gcsUri,
    };
  }

  async download(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<string | null> {
    const { objectPath, uri, userId, filename, ext } = params;

    let bucketName: string | null = null;
    let resolvedPath: string | null = null;

    if (uri) {
      if (!uri.startsWith('gs://')) return null;
      const [, , b, ...rest] = uri.split('/');
      bucketName = b ?? null;
      resolvedPath = rest.join('/') || null;
      if (!bucketName || !resolvedPath) return null;
    } else if (objectPath) {
      resolvedPath = objectPath;
    } else {
      if (!userId || !filename || !ext) {
        throw new Error('objectPath or (userId, filename, ext) must be provided');
      }
      resolvedPath = `${userId}/${filename}.${ext}`;
    }

    const bucket = this.storage.bucket(bucketName ?? this.options.bucket);
    const file = bucket.file(resolvedPath);
    const [exists] = await file.exists();
    if (!exists) return null;
    try {
      const [data] = await file.download();
      return data.toString('utf8');
    } catch (error) {
      const err = error as { code?: number } | undefined;
      if (err?.code === 404) return null;
      throw error;
    }
  }

  async downloadBinary(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<Uint8Array | null> {
    const { objectPath, uri, userId, filename, ext } = params;

    let bucketName: string | null = null;
    let resolvedPath: string | null = null;

    if (uri) {
      if (!uri.startsWith('gs://')) return null;
      const [, , b, ...rest] = uri.split('/');
      bucketName = b ?? null;
      resolvedPath = rest.join('/') || null;
      if (!bucketName || !resolvedPath) return null;
    } else if (objectPath) {
      resolvedPath = objectPath;
    } else {
      if (!userId || !filename || !ext) {
        throw new Error('objectPath or (userId, filename, ext) must be provided');
      }
      resolvedPath = `${userId}/${filename}.${ext}`;
    }

    const bucket = this.storage.bucket(bucketName ?? this.options.bucket);
    const file = bucket.file(resolvedPath);
    const [exists] = await file.exists();
    if (!exists) return null;
    try {
      const [data] = await file.download();
      return new Uint8Array(data);
    } catch (error) {
      const err = error as { code?: number } | undefined;
      if (err?.code === 404) return null;
      throw error;
    }
  }

  async deleteByPrefix(params: { prefix: string }): Promise<void> {
    const bucket = this.storage.bucket(this.options.bucket);
    await bucket.deleteFiles({ prefix: params.prefix });
  }
}
