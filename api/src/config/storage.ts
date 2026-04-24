export interface StorageConfig {
  bucket: string;
  backend: 'gcs' | 'local';
  localRoot: string;
}

// Load configuration for GCS uploads.
export function loadStorageConfig(): StorageConfig {
  const bucket = process.env.USER_FILE_BUCKET ?? process.env.BUCKET_NAME ?? '';
  const rawBackend = process.env.STORAGE_BACKEND?.trim().toLowerCase();
  const backend =
    rawBackend === 'gcs' || rawBackend === 'local'
      ? rawBackend
      : process.env.NODE_ENV === 'development'
        ? 'local'
        : 'gcs';
  const localRoot = process.env.LOCAL_STORAGE_ROOT?.trim() || '.data/storage';

  if (!bucket) {
    throw new Error('USER_FILE_BUCKET (or BUCKET_NAME) must be set to the user file bucket name.');
  }

  return { bucket, backend, localRoot };
}
