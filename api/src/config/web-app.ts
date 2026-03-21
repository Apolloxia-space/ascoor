import { trimToNull } from '../utils/env';

export interface WebAppConfig {
  baseUrl: string | null;
}

function normalizeBaseUrl(raw: string): string {
  const parsed = new URL(raw);
  const path = parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname;
  return `${parsed.origin}${path}`;
}

export function loadWebAppConfig(): WebAppConfig {
  const raw = trimToNull(process.env.WEB_APP_BASE_URL);
  if (!raw) {
    return { baseUrl: null };
  }
  return {
    baseUrl: normalizeBaseUrl(raw),
  };
}
