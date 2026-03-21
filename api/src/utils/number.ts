export function normalizePositiveInt(
  value: number | null | undefined,
  options: {
    defaultValue: number;
    max?: number;
  },
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return options.defaultValue;
  }

  const floored = Math.floor(value);
  if (typeof options.max === 'number' && Number.isFinite(options.max)) {
    return Math.min(options.max, floored);
  }
  return floored;
}
