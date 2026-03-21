type CachedToken = {
  value: string;
  expiresAt: number;
};

type AccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

export type GcpAccessTokenProviderOptions = {
  tokenUrl?: string;
  tokenTtlMs?: number;
  cacheSkewMs?: number;
};

const DEFAULT_TOKEN_URL =
  'http://metadata/computeMetadata/v1/instance/service-accounts/default/token';
const DEFAULT_TOKEN_TTL_MS = 50 * 60_000;
const DEFAULT_CACHE_SKEW_MS = 60_000;

export class GcpAccessTokenProvider {
  private readonly tokenUrl: string;
  private readonly tokenTtlMs: number;
  private readonly cacheSkewMs: number;
  private cache: CachedToken | null = null;

  constructor(options: GcpAccessTokenProviderOptions = {}) {
    this.tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL;
    this.tokenTtlMs = options.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
    this.cacheSkewMs = options.cacheSkewMs ?? DEFAULT_CACHE_SKEW_MS;
  }

  async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now + this.cacheSkewMs) {
      return this.cache.value;
    }

    const response = await fetch(this.tokenUrl, {
      headers: { 'metadata-flavor': 'Google' },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as AccessTokenResponse;
    if (!data.access_token) {
      return null;
    }
    const ttlMs = (data.expires_in ?? 0) * 1000 || this.tokenTtlMs;
    const token = { value: data.access_token, expiresAt: now + ttlMs };
    this.cache = token;
    return token.value;
  }
}
