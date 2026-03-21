export interface DbConfig {
  connectionString?: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  pool: DbPoolConfig;
}

export interface DbPoolConfig {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

function parseOptionalIntEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function loadDbPoolConfig(): DbPoolConfig {
  return {
    max: parseOptionalIntEnv('DB_POOL_MAX'),
    idleTimeoutMillis: parseOptionalIntEnv('DB_POOL_IDLE_TIMEOUT_MS'),
    connectionTimeoutMillis: parseOptionalIntEnv('DB_POOL_CONNECTION_TIMEOUT_MS'),
  };
}

export function loadDbConfig(): DbConfig {
  const { DATABASE_URL, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const pool = loadDbPoolConfig();

  // Prisma のデフォルト命名に合わせ、接続文字列は DATABASE_URL に統一
  const connectionString = DATABASE_URL;

  if (connectionString) {
    // Cloud SQL など接続文字列が用意されている環境ではこちらを優先
    const parsed = new URL(connectionString);
    const path = parsed.pathname.replace(/^\//, '');

    return {
      connectionString,
      host: DB_HOST ?? parsed.hostname ?? 'localhost',
      port: Number.parseInt(DB_PORT ?? parsed.port ?? '5432', 10),
      user: DB_USER ?? parsed.username ?? 'postgres',
      password: DB_PASSWORD ?? parsed.password ?? '',
      database: DB_NAME ?? path ?? 'postgres',
      pool,
    };
  }

  // ローカル開発など接続文字列がない場合は個別の環境変数をそのまま使う
  return {
    connectionString: undefined,
    host: DB_HOST ?? 'localhost',
    port: Number.parseInt(DB_PORT ?? '5432', 10),
    user: DB_USER ?? 'postgres',
    password: DB_PASSWORD ?? '',
    database: DB_NAME ?? 'postgres',
    pool,
  };
}
