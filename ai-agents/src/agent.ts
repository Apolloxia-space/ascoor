export { InvokeError, toInvokeErrorOut } from './usecases/errors';
import { createDependencies } from './dependencies';
import type { CompilePromptIn } from './entities/prompt-compile';
import type { DesignIn } from './entities/design';
import type { DesignTitleIn } from './entities/title';
import type { TraceContext } from './repositories/ai/runtime';

const dependencies = createDependencies();

export const runDesign = (input: DesignIn, traceContext?: TraceContext) =>
  dependencies.designUsecase.run(input, traceContext);

export const runCompilePrompt = (input: CompilePromptIn, traceContext?: TraceContext) =>
  dependencies.promptCompileUsecase.run(input, traceContext);

export const runDesignTitle = (input: DesignTitleIn, traceContext?: TraceContext) =>
  dependencies.titleUsecase.run(input, traceContext);
