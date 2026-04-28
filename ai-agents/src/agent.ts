export { InvokeError, toInvokeErrorOut } from './usecases/errors';
import { createDependencies } from './dependencies';
import type { CompilePromptIn } from './entities/prompt-compile';
import type { AssetPackIn } from './entities/asset-pack';
import type { AssetPackTitleIn } from './entities/title';
import type { TraceContext } from './repositories/ai/runtime';

const dependencies = createDependencies();

export const runAssetPack = (input: AssetPackIn, traceContext?: TraceContext) =>
  dependencies.assetPackUsecase.run(input, traceContext);

export const runCompilePrompt = (input: CompilePromptIn, traceContext?: TraceContext) =>
  dependencies.promptCompileUsecase.run(input, traceContext);

export const runAssetPackTitle = (input: AssetPackTitleIn, traceContext?: TraceContext) =>
  dependencies.titleUsecase.run(input, traceContext);
