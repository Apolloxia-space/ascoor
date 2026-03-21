import { randomUUID } from 'node:crypto';
import type { AppRouter } from './types';

export function registerRequestContextMiddleware(app: AppRouter): void {
  app.use('*', async (c, next) => {
    const requestId = c.req.header('x-origin-request-id')?.trim() || randomUUID();
    const designId = c.req.header('x-design-id')?.trim() || null;
    const traceId = c.req.header('x-trace-id')?.trim() || designId || requestId;

    c.set('requestId', requestId);
    c.set('designId', designId);
    c.set('traceId', traceId);
    c.header('x-request-id', requestId);
    c.header('x-trace-id', traceId);

    await next();
  });
}
