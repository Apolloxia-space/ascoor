import { assetPackPlanInSchema } from '../entities/asset-pack-plan';
import type { IAssetPackPlanUsecase } from '../usecases/asset-pack-plan.usecase';
import type { AppRouter } from './types';
import { parseAndValidate } from './validation';

export function registerAssetPackPlanRoutes(
  app: AppRouter,
  usecase: IAssetPackPlanUsecase,
): void {
  app.post('/asset-pack-plan', async (c) => {
    const parsed = await parseAndValidate(c, assetPackPlanInSchema);
    if (!parsed.ok) return parsed.response;

    const result = await usecase.run(parsed.data, {
      requestId: c.get('requestId'),
      traceId: c.get('traceId'),
      packGenerationJobId: c.get('packGenerationJobId'),
    });

    return c.json(result, 200);
  });
}
