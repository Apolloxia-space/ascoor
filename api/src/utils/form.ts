type ErrorFactory = (message: string) => Error;

export function normalizeRequiredFormValue(
  value: string,
  options: {
    field: string;
    maxChars: number;
    errorFactory: ErrorFactory;
  },
) {
  const normalized = value.trim();
  if (!normalized) {
    throw options.errorFactory(`${options.field} is required`);
  }
  if (normalized.length > options.maxChars) {
    throw options.errorFactory(
      `${options.field} must be at most ${options.maxChars} characters`,
    );
  }
  return normalized;
}
