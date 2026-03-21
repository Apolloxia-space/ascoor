import { serve } from '@hono/node-server';
import { createApp } from './app';
import { config } from './config';
import { logEvent } from './logger';

const app = createApp();

const server = serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
});

logEvent('ai_agent.server.started', {
  host: config.host,
  port: config.port,
});

const shutdown = (signal: string): void => {
  logEvent('ai_agent.server.shutdown', { signal });
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
