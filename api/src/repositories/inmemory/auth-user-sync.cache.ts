import { InMemorySyncCache } from './inmemory';

const DEFAULT_USER_SYNC_WINDOW_MS = 5 * 60 * 1000;

export class AuthUserSyncCache {
  private readonly cache: InMemorySyncCache<string>;
  private readonly windowMs: number;

  constructor(options?: { max?: number; windowMs?: number }) {
    this.cache = new InMemorySyncCache<string>({ max: options?.max ?? 1000 });
    this.windowMs = options?.windowMs ?? DEFAULT_USER_SYNC_WINDOW_MS;
  }

  has(userId: string): boolean {
    return this.cache.has(userId);
  }

  markSynced(userId: string): void {
    this.cache.set(userId, true, this.windowMs);
  }

  clear(): void {
    this.cache.clear();
  }
}
