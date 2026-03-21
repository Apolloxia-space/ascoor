import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  outDir: 'dist',
  external: ['@prisma/client', '@prisma/adapter-pg', '.prisma/client'],
});
