import type { MiddlewareHandler } from 'hono';
import { getAuth } from 'firebase-admin/auth';
import { app as adminApp } from '../infra/firebase-admin';
import type { AppEnv } from '../entities/app-env';
import type { Md } from '../entities/md';
import { logger } from '../utils/logger';

export const authMiddleware: MiddlewareHandler = async (
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  next,
) => {
  const authHeader = c.req.header('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const path = c.req.path;
  // Public paths should skip auth even if an Authorization header is present.
  if (isPublicPath(path)) {
    return next();
  }

  if (!token) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  try {
    const auth = getAuth(adminApp);
    const decoded = await auth.verifyIdToken(token, true);
    const md: Md = {
      userId: decoded.uid,
      userEmail: decoded.email ?? null,
      userName: decoded.name ?? null,
    };
    c.set('md', md);

    await next();
  } catch (error) {
    logger.warn('auth_failed', {
      error_message: (error as Error)?.message ?? String(error),
      path: c.req.path,
      requestId: c.get('requestId'),
    });
    return c.json({ error: 'unauthorized' }, 401);
  }
};

function isPublicPath(path: string) {
  return path === '/' || path === '/health' || path === '/billing/webhook';
}
