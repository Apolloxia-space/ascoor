import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 では datasource の URL を schema ではなくここで指定する
// Prisma は DATABASE_URL を標準で参照するため、この環境変数に統一
const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error('DATABASE_URL is required for Prisma configuration');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
});
