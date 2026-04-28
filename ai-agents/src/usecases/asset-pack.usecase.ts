import type { IAssetPackRepository } from '../repositories/ai/asset-pack.repository';
import type { ITitleRepository } from '../repositories/ai/title.repository';
import type { AssetPackIn, AssetPackOut } from '../entities/asset-pack';
import { resolveTraceContext, type TraceContext } from '../repositories/ai/runtime';
import { InvokeError } from './errors';

export interface IAssetPackUsecase {
  run(input: AssetPackIn, traceContext?: TraceContext): Promise<AssetPackOut>;
}

export class AssetPackUsecase implements IAssetPackUsecase {
  constructor(
    private readonly assetPackRepository: IAssetPackRepository,
    private readonly titleRepository: ITitleRepository,
  ) {}

  async run(input: AssetPackIn, traceContext?: TraceContext): Promise<AssetPackOut> {
    const trace = resolveTraceContext({
      requestId: input.requestId ?? traceContext?.requestId,
      traceId: input.traceId ?? traceContext?.traceId,
      packGenerationJobId: input.packGenerationJobId ?? traceContext?.packGenerationJobId,
    });

    try {
      const code = await this.assetPackRepository.generateAssetPackCode({
        prompt: input.prompt,
        trace,
      });

      const title = input.skipTitle
        ? 'Generated part'
        : await this.titleRepository.generateTitle({
            prompt: input.userPrompt?.trim() || input.prompt,
            trace,
          });

      return {
        message: 'Generated a message.',
        title,
        code,
      };
    } catch (error) {
      if (error instanceof InvokeError) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      const code =
        reason === 'empty title'
          ? 'AI_AGENT_EMPTY_TITLE'
          : reason === 'empty code'
            ? 'AI_AGENT_EMPTY_CODE'
            : 'AI_AGENT_ASSET_PACK_FAILED';
      const message =
        reason === 'empty title'
          ? 'Failed to generate a title.'
          : reason === 'empty code'
            ? 'Asset pack generation did not return executable code.'
            : 'AI agent asset pack generation failed.';
      throw new InvokeError({
        statusCode: 502,
        code,
        message,
        stage: 'asset_pack',
        requestId: trace.requestId,
        traceId: trace.traceId,
        packGenerationJobId: trace.packGenerationJobId || undefined,
        details: { failure_reason: reason },
      });
    }
  }
}
