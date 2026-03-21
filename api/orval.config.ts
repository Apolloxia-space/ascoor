import { defineConfig } from 'orval';

export default defineConfig({
  ascoorApi: {
    input: '../openapi/openapi.yaml',
    output: {
      mode: 'tags-split',
      client: 'hono',
      target: './src/generated/endpoints',
      schemas: './src/generated/schemas',
      clean: true,
      override: {
        hono: {
          validatorOutputPath: './src/generated/validator.ts',
          compositeRoute: './src/generated/routes.ts',
        },
      },
    },
  },
});
