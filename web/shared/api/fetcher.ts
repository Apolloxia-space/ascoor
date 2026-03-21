export type ApiFetcherRequestInit = RequestInit & {
  params?: Record<string, unknown>;
  responseType?: 'blob' | 'arrayBuffer' | 'json' | 'text';
};

export type ApiHttpResponse<TBody> = {
  data: TBody;
  status: number;
  headers: Headers;
};

export interface ApiError<TBody = unknown> extends Error {
  status: number;
  body?: TBody;
}

// Auth token getter injected via auth store
let authTokenGetter: (() => string | null | Promise<string | null>) | null = null;
export function setAuthTokenGetter(fn: () => string | null | Promise<string | null>) {
  authTokenGetter = fn;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
}

export async function apiFetcher<TResponse>(
  url: string,
  requestInit: ApiFetcherRequestInit = {},
): Promise<TResponse> {
  const { params, responseType, headers, ...rest } = requestInit;
  const traceId = buildTraceId();
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('X-Trace-Id')) {
    requestHeaders.set('X-Trace-Id', traceId);
  }

  const token = authTokenGetter ? await authTokenGetter() : null;
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(url, params), {
    ...rest,
    headers: requestHeaders,
  });
  const parsed = await parseBody(response, responseType);

  if (!response.ok) {
    const error = new Error('API request failed') as ApiError;
    error.status = response.status;
    error.body = parsed;
    throw error;
  }

  return {
    data: parsed,
    status: response.status,
    headers: response.headers,
  } as ApiHttpResponse<unknown> as TResponse;
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const base = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined);
  const url = path.startsWith('http') ? new URL(path) : new URL(path, base);

  if (!params) return url.toString();

  const search = url.searchParams;
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      search.append(key, stringify(v));
    }
  }

  return url.toString();
}

async function parseBody(response: Response, responseType?: ApiFetcherRequestInit['responseType']) {
  if (response.status === 204) return undefined;

  if (responseType === 'blob') return response.blob();
  if (responseType === 'arrayBuffer') return response.arrayBuffer();
  if (responseType === 'text') return response.text();
  if (responseType === 'json') return response.json();

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('json')) return response.json();
  if (contentType.startsWith('text/')) return response.text();
  return response.blob();
}

function stringify(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function buildTraceId() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Ignore and fallback below.
  }
  return `trace-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
