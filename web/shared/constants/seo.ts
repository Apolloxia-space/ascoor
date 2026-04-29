const DEFAULT_SITE_URL = 'https://ascoor.app';

const normalizeSiteUrl = (rawUrl?: string) => {
  if (!rawUrl) return DEFAULT_SITE_URL;
  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
};

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const siteName = 'Ascoor';
export const defaultDescription =
  'Ascoor is a browser-based studio for generating cohesive prototype game asset packs, previewing each part, and downloading reusable GLB assets as a ZIP.';
export const defaultOgImagePath = '/og/default-1200x630-v20260325.jpeg';
