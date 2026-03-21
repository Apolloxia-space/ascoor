import { designInSchema } from '../entities/design';
import type { IDesignUsecase } from '../usecases/design.usecase';
import type { AppRouter } from './types';
import { parseAndValidate } from './validation';

export function registerDesignRoutes(app: AppRouter, usecase: IDesignUsecase): void {
  app.post('/design', async (c) => {
    const parsed = await parseAndValidate(c, designInSchema);
    if (!parsed.ok) return parsed.response;

    const result = await usecase.run(parsed.data, {
      requestId: c.get('requestId'),
      traceId: c.get('traceId'),
      designId: c.get('designId'),
    });

    return c.json(result, 200);
  });
}
