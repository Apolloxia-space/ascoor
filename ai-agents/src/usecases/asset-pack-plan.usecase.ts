import type { AssetPackPlan, AssetPackPlanIn } from '../entities/asset-pack-plan';
import type { IAssetPackPlanRepository } from '../repositories/ai/asset-pack-plan.repository';
import { resolveTraceContext, type TraceContext } from '../repositories/ai/runtime';
import { InvokeError } from './errors';

export interface IAssetPackPlanUsecase {
  run(input: AssetPackPlanIn, traceContext?: TraceContext): Promise<AssetPackPlan>;
}

export class AssetPackPlanUsecase implements IAssetPackPlanUsecase {
  constructor(private readonly repository: IAssetPackPlanRepository) {}

  async run(input: AssetPackPlanIn, traceContext?: TraceContext): Promise<AssetPackPlan> {
    const trace = resolveTraceContext({
      requestId: input.requestId ?? traceContext?.requestId,
      traceId: input.traceId ?? traceContext?.traceId,
      designId: input.designId ?? traceContext?.designId,
    });

    try {
      return await this.repository.plan({
        prompt: input.prompt,
        trace,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new InvokeError({
        statusCode: 502,
        code: 'AI_AGENT_PACK_PLAN_FAILED',
        message: 'AI agent asset pack plan failed.',
        stage: 'asset_pack_plan',
        requestId: trace.requestId,
        traceId: trace.traceId,
        designId: trace.designId || undefined,
        details: { failure_reason: reason },
      });
    }
  }
}
