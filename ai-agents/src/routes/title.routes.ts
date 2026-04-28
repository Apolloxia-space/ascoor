import { assetPackTitleInSchema } from '../entities/title';
import type { ITitleUsecase } from '../usecases/title.usecase';
import type { AppRouter } from './types';
import { parseAndValidate } from './validation';

export function registerTitleRoutes(app: AppRouter, usecase: ITitleUsecase): void {
  app.post('/asset-pack-title', async (c) => {
    const parsed = await parseAndValidate(c, assetPackTitleInSchema);
    if (!parsed.ok) return parsed.response;

    const result = await usecase.run(parsed.data, {
      requestId: c.get('requestId'),
      traceId: c.get('traceId'),
      packGenerationJobId: c.get('packGenerationJobId'),
    });

    return c.json(result, 200);
  });
}
