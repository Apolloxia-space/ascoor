type CachedToken = {
  value: string;
  expiresAt: number;
};

export type GcpIdTokenProviderOptions = {
  identityUrl?: string;
  tokenTtlMs?: number;
  cacheSkewMs?: number;
};

const DEFAULT_IDENTITY_URL =
  'http://metadata/computeMetadata/v1/instance/service-accounts/default/identity';
const DEFAULT_TOKEN_TTL_MS = 50 * 60_000;
const DEFAULT_CACHE_SKEW_MS = 60_000;

export class GcpIdTokenProvider {
  private readonly identityUrl: string;
  private readonly tokenTtlMs: number;
  private readonly cacheSkewMs: number;
  private readonly cache = new Map<string, CachedToken>();

  constructor(options: GcpIdTokenProviderOptions = {}) {
    this.identityUrl = options.identityUrl ?? DEFAULT_IDENTITY_URL;
    this.tokenTtlMs = options.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
    this.cacheSkewMs = options.cacheSkewMs ?? DEFAULT_CACHE_SKEW_MS;
  }

  async getIdToken(audience: string): Promise<string | null> {
    const now = Date.now();
    const cached = this.cache.get(audience);
    if (cached && cached.expiresAt > now + this.cacheSkewMs) {
      return cached.value;
    }

    const url = new URL(this.identityUrl);
    url.searchParams.set('audience', audience);
    url.searchParams.set('format', 'full');

    const response = await fetch(url, {
      headers: { 'metadata-flavor': 'Google' },
    });
    if (!response.ok) {
      return null;
    }
    const token = await response.text();
    this.cache.set(audience, { value: token, expiresAt: now + this.tokenTtlMs });
    return token;
  }
}
