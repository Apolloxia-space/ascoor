import { LRUCache } from 'lru-cache';

export interface TtlCache<K = string, V = true> {
  set(key: K, value: V, ttlMs: number): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
}

/**
 * LRU + TTL ベースの簡易キャッシュ。set 時に ttl を指定し、期限到来で自動削除される。
 */
export class InMemorySyncCache<
  K extends string | number | symbol = string,
  V extends object | boolean = boolean,
> implements TtlCache<K, V>
{
  private readonly cache: LRUCache<K, V>;

  constructor(options?: { max?: number }) {
    this.cache = new LRUCache<K, V>({
      max: options?.max ?? 1000,
    });
  }

  set(key: K, value: V, ttlMs: number): void {
    this.cache.set(key, value, { ttl: ttlMs });
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

type CacheBox<T> = { value: T };

/**
 * 非同期ローダー付きのキャッシュ。TTL + 同時実行の重複抑止(single-flight)を提供する。
 */
export class InMemoryAsyncCache<K extends string = string> {
  private readonly cache: InMemorySyncCache<K, CacheBox<unknown>>;
  private readonly inflight = new Map<K, Promise<unknown>>();

  constructor(options?: { max?: number }) {
    this.cache = new InMemorySyncCache<K, CacheBox<unknown>>({
      max: options?.max ?? 1000,
    });
  }

  async loadThrough<T>(key: K, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key) as CacheBox<T> | undefined;
    if (cached) {
      return cached.value;
    }

    const active = this.inflight.get(key) as Promise<T> | undefined;
    if (active) {
      return active;
    }

    const next = loader()
      .then((value) => {
        this.cache.set(key, { value }, ttlMs);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, next);
    return next;
  }

  delete(key: K): boolean {
    this.inflight.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.inflight.clear();
    this.cache.clear();
  }
}
