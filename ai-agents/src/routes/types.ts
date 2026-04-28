import type { Context, Hono } from 'hono';

export type AppBindings = {
  Variables: {
    requestId: string;
    traceId: string;
    packGenerationJobId: string | null;
  };
};

export type AppContext = Context<AppBindings>;
export type AppRouter = Hono<AppBindings>;
