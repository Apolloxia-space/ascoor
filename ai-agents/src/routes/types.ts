import type { Context, Hono } from 'hono';

export type AppBindings = {
  Variables: {
    requestId: string;
    traceId: string;
    designId: string | null;
  };
};

export type AppContext = Context<AppBindings>;
export type AppRouter = Hono<AppBindings>;
