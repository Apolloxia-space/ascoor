import type { ITitleRepository } from '../repositories/ai/title.repository';
import type { AssetPackTitleIn, AssetPackTitleOut } from '../entities/title';
import { resolveTraceContext, type TraceContext } from '../repositories/ai/runtime';
import { InvokeError } from './errors';

function classifyTitleFailure(reason: string): [string, string] {
  if (reason === 'empty title') {
    return ['AI_AGENT_EMPTY_TITLE', 'Failed to generate a title.'];
  }
  return ['AI_AGENT_ASSET_PACK_FAILED', 'AI agent asset pack generation failed.'];
}

export interface ITitleUsecase {
  run(input: AssetPackTitleIn, traceContext?: TraceContext): Promise<AssetPackTitleOut>;
}

export class TitleUsecase implements ITitleUsecase {
  constructor(private readonly titleRepository: ITitleRepository) {}

  async run(input: AssetPackTitleIn, traceContext?: TraceContext): Promise<AssetPackTitleOut> {
    const trace = resolveTraceContext({
      requestId: input.requestId ?? traceContext?.requestId,
      traceId: input.traceId ?? traceContext?.traceId,
      packGenerationJobId: input.packGenerationJobId ?? traceContext?.packGenerationJobId,
    });

    try {
      const title = await this.titleRepository.generateTitle({
        prompt: input.prompt,
        trace,
      });
      return { title };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const [code, message] = classifyTitleFailure(reason);
      throw new InvokeError({
        statusCode: 502,
        code,
        message,
        stage: 'asset_pack_title',
        requestId: trace.requestId,
        traceId: trace.traceId,
        packGenerationJobId: trace.packGenerationJobId || undefined,
        details: { failure_reason: reason },
      });
    }
  }
}
