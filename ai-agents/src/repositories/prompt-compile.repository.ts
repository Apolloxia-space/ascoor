import type { ResolvedTraceContext } from './ai/runtime';
import { buildThreeJsCompiledPrompt } from './threejs-guidelines';

export type CompilePromptInput = {
  userPrompt: string;
  trace: ResolvedTraceContext;
};

export interface IPromptCompileRepository {
  compilePrompt(input: CompilePromptInput): Promise<string>;
}

export class PromptCompileRepository implements IPromptCompileRepository {
  async compilePrompt(input: CompilePromptInput): Promise<string> {
    return buildThreeJsCompiledPrompt(input.userPrompt);
  }
}
