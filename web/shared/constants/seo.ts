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
  'Ascoor is a browser-based 3D design studio with Create and Edit workspaces, project history, and GLB, STL, and JavaScript exports.';
const defaultOgImageVersion = '20260322';
export const defaultOgImagePath = `/og/default-1200x630.jpeg?v=${defaultOgImageVersion}`;
