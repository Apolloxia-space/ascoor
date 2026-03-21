import { designTitleInSchema } from '../entities/title';
import type { ITitleUsecase } from '../usecases/title.usecase';
import type { AppRouter } from './types';
import { parseAndValidate } from './validation';

export function registerTitleRoutes(app: AppRouter, usecase: ITitleUsecase): void {
  app.post('/design-title', async (c) => {
    const parsed = await parseAndValidate(c, designTitleInSchema);
    if (!parsed.ok) return parsed.response;

    const result = await usecase.run(parsed.data, {
      requestId: c.get('requestId'),
      traceId: c.get('traceId'),
      designId: c.get('designId'),
    });

    return c.json(result, 200);
  });
}
