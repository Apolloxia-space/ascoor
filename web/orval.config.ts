import { defineConfig } from 'orval';

export default defineConfig({
  ascoor: {
    input: '../openapi/openapi.yaml',
    output: {
      target: './shared/api/generated/client.ts',
      schemas: './shared/api/generated/schemas',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './shared/api/fetcher.ts',
          name: 'apiFetcher',
        },
      },
    },
  },
});
