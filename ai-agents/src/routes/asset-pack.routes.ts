import { assetPackInSchema } from '../entities/asset-pack';
import type { IAssetPackUsecase } from '../usecases/asset-pack.usecase';
import type { AppRouter } from './types';
import { parseAndValidate } from './validation';

export function registerAssetPackRoutes(app: AppRouter, usecase: IAssetPackUsecase): void {
  app.post('/asset-pack', async (c) => {
    const parsed = await parseAndValidate(c, assetPackInSchema);
    if (!parsed.ok) return parsed.response;

    const result = await usecase.run(parsed.data, {
      requestId: c.get('requestId'),
      traceId: c.get('traceId'),
      packGenerationJobId: c.get('packGenerationJobId'),
    });

    return c.json(result, 200);
  });
}
