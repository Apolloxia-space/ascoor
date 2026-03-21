export interface StorageConfig {
  bucket: string;
}

// Load configuration for GCS uploads.
export function loadStorageConfig(): StorageConfig {
  const bucket = process.env.USER_FILE_BUCKET ?? process.env.BUCKET_NAME ?? '';

  if (!bucket) {
    throw new Error('USER_FILE_BUCKET (or BUCKET_NAME) must be set to the user file bucket name.');
  }

  return { bucket };
}
