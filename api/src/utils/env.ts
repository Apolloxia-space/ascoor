type ParseBooleanEnvOptions = {
  trim?: boolean;
  fallbackOnEmpty?: boolean;
};

export function parsePositiveNumberEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function parseBooleanEnv(
  value: string | undefined,
  fallback: boolean,
  options?: ParseBooleanEnvOptions,
): boolean {
  if (value === undefined) return fallback;
  const trim = options?.trim ?? false;
  const fallbackOnEmpty = options?.fallbackOnEmpty ?? true;
  const normalized = trim ? value.trim() : value;
  if (!normalized && fallbackOnEmpty) return fallback;
  return normalized.toLowerCase() === 'true';
}

export function trimToNull(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
