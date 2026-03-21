import { serve } from '@hono/node-server';
import { ensureDatabaseConnection, closePrismaClient, getDbConnectionInfo } from './db/client';
import { buildDependencies } from './dependencies';
import { createWorkerApp } from './worker-app';

export async function startWorker() {
  const port = Number(process.env.PORT ?? 3100);
  const hostname = process.env.HOST ?? '0.0.0.0';

  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error(
      'Failed to connect to the database. Please check your environment variables.',
      error,
    );
    process.exit(1);
  }

  const dbInfo = getDbConnectionInfo();
  console.log(
    `Database connected: ${dbInfo.database} @ ${
      dbInfo.viaUrl ? 'DATABASE_URL' : `${dbInfo.host}:${dbInfo.port}`
    }`,
  );

  const dependencies = buildDependencies();
  const app = createWorkerApp(dependencies);
  const server = serve({
    fetch: app.fetch,
    port,
    hostname,
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      closePrismaClient()
        .catch((error) => {
          console.error('Failed to disconnect the Prisma client.', error);
        })
        .finally(() => process.exit(0));
    });
  });

  process.on('SIGINT', () => {
    server.close(() => {
      closePrismaClient()
        .catch((error) => {
          console.error('Failed to disconnect the Prisma client.', error);
        })
        .finally(() => process.exit(0));
    });
  });

  console.log(`Worker listening on http://${hostname}:${port}`);
}

startWorker();
