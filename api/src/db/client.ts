import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { DbConfig } from '../config/env';
import { loadDbConfig } from '../config/env';

function buildConnectionString(config: DbConfig): string {
  if (config.connectionString) {
    return config.connectionString;
  }

  const hasUser = config.user.length > 0;
  const hasPassword = config.password.length > 0;
  const encodedUser = hasUser ? encodeURIComponent(config.user) : '';
  const encodedPassword = hasPassword ? `:${encodeURIComponent(config.password)}` : '';
  const auth = hasUser || hasPassword ? `${encodedUser}${encodedPassword}@` : '';

  // Cloud Run + Cloud SQL の Unix ソケット接続では host が "/cloudsql/<instance>" の形で渡される。
  // pg の接続文字列はクエリパラメータ host にソケットパスを付ける必要がある。
  if (config.host.startsWith('/')) {
    const dbName = encodeURIComponent(config.database);
    const socketHost = encodeURIComponent(config.host);
    return `postgresql://${auth}/${dbName}?host=${socketHost}`;
  }

  return `postgresql://${auth}${config.host}:${config.port}/${encodeURIComponent(config.database)}`;
}

const config = loadDbConfig();
const datasourceUrl = buildConnectionString(config);

let prisma: PrismaClient | undefined;

function buildPoolConfig(connectionString: string, dbConfig: DbConfig) {
  return {
    connectionString,
    max: dbConfig.pool.max,
    idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
  };
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg(buildPoolConfig(datasourceUrl, config));
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export async function ensureDatabaseConnection() {
  await getPrismaClient().$connect();
}

export function getDbConnectionInfo() {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    viaUrl: Boolean(config.connectionString),
    poolMax: config.pool.max ?? 'default',
  };
}

export async function closePrismaClient() {
  if (!prisma) {
    return;
  }
  await prisma.$disconnect();
  prisma = undefined;
}
