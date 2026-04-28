import { compilePromptInSchema, type CompilePromptOut } from '../entities/prompt-compile';
import { InvokeError } from '../usecases/errors';
import type { IPromptCompileUsecase } from '../usecases/prompt-compile.usecase';
import type { AppRouter } from './types';
import { parseAndValidate } from './validation';

export function registerPromptCompileRoutes(app: AppRouter, usecase: IPromptCompileUsecase): void {
  app.post('/compile-prompt', async (c) => {
    const parsed = await parseAndValidate(c, compilePromptInSchema);
    if (!parsed.ok) return parsed.response;

    try {
      const compiled = await usecase.run(parsed.data, {
        requestId: c.get('requestId'),
        traceId: c.get('traceId'),
        packGenerationJobId: c.get('packGenerationJobId'),
      });

      if (!compiled.trim()) {
        throw new InvokeError({
          statusCode: 502,
          code: 'PROMPT_COMPILE_EMPTY',
          message: 'Compiled prompt is empty.',
          stage: 'prompt_compile',
          requestId: c.get('requestId'),
          traceId: c.get('traceId'),
          packGenerationJobId: c.get('packGenerationJobId') || undefined,
        });
      }

      const response: CompilePromptOut = { compiledPrompt: compiled.trim() };
      return c.json(response, 200);
    } catch (error) {
      if (error instanceof InvokeError) throw error;
      throw new InvokeError({
        statusCode: 502,
        code: 'PROMPT_COMPILE_FAILED',
        message: `Prompt compilation failed: ${String(error)}`,
        stage: 'prompt_compile',
        requestId: c.get('requestId'),
        traceId: c.get('traceId'),
        packGenerationJobId: c.get('packGenerationJobId') || undefined,
      });
    }
  });
}
