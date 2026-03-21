export function resolveUserFileBucketPrefix(): string | undefined {
  return process.env.USER_FILE_PREFIX; // optional `${resource_prefix}-user-file`
}
