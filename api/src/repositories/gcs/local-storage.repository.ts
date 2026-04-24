import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GeneratedDesignInfo } from '../../entities/designs';
import type { UploadedObjectInfo } from '../../entities/storage';
import type { IGcsRepository } from '../interfaces';

export interface LocalStorageRepositoryOptions {
  bucket: string;
  rootDir: string;
}

export class LocalStorageRepository implements IGcsRepository {
  private readonly rootDir: string;

  constructor(private readonly options: LocalStorageRepositoryOptions) {
    this.rootDir = path.resolve(options.rootDir);
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
    const objectPath = this.resolveObjectPath(params);
    await this.writeObject(objectPath, Buffer.from(params.content, 'utf8'));

    return {
      bucket: this.options.bucket,
      filename: objectPath,
      gcsUri: this.toGcsUri(objectPath),
      content: params.content,
    };
  }

  async uploadBinary(params: {
    content: Uint8Array;
    contentType: string;
    metadata?: Record<string, string>;
    objectPath: string;
  }): Promise<UploadedObjectInfo> {
    await this.writeObject(params.objectPath, Buffer.from(params.content));

    return {
      bucket: this.options.bucket,
      objectPath: params.objectPath,
      gcsUri: this.toGcsUri(params.objectPath),
    };
  }

  async download(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<string | null> {
    const data = await this.readObject(this.resolveObjectPath(params));
    return data?.toString('utf8') ?? null;
  }

  async downloadBinary(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<Uint8Array | null> {
    const data = await this.readObject(this.resolveObjectPath(params));
    return data ? new Uint8Array(data) : null;
  }

  async deleteByPrefix(params: { prefix: string }): Promise<void> {
    await rm(this.resolveStoragePath(params.prefix), { recursive: true, force: true });
  }

  private async writeObject(objectPath: string, content: Buffer) {
    const filePath = this.resolveStoragePath(objectPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  private async readObject(objectPath: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolveStoragePath(objectPath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'EISDIR') return null;
      throw error;
    }
  }

  private resolveObjectPath(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }) {
    if (params.uri) return this.objectPathFromUri(params.uri);
    if (params.objectPath) return params.objectPath;
    if (!params.userId || !params.filename || !params.ext) {
      throw new Error('objectPath or (userId, filename, ext) must be provided');
    }
    return `${params.userId}/${params.filename}.${params.ext}`;
  }

  private objectPathFromUri(uri: string) {
    if (!uri.startsWith('gs://')) {
      throw new Error(`Unsupported local storage URI: ${uri}`);
    }
    const [, , bucket, ...rest] = uri.split('/');
    const objectPath = rest.join('/');
    if (!bucket || !objectPath) {
      throw new Error(`Invalid local storage URI: ${uri}`);
    }
    return objectPath;
  }

  private resolveStoragePath(objectPath: string) {
    const resolved = path.resolve(this.rootDir, objectPath);
    if (resolved !== this.rootDir && !resolved.startsWith(`${this.rootDir}${path.sep}`)) {
      throw new Error(`Invalid local storage path: ${objectPath}`);
    }
    return resolved;
  }

  private toGcsUri(objectPath: string) {
    return `gs://${this.options.bucket}/${objectPath}`;
  }
}
