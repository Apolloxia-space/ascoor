import type { ResolvedTraceContext } from './runtime';
import { BaseAiRepository } from './base-ai.repository';
import { assetPackDomainSettings } from './domain-settings';

export type AssetPackCodeInput = {
  prompt: string;
  trace: ResolvedTraceContext;
};

export interface IAssetPackRepository {
  generateAssetPackCode(input: AssetPackCodeInput): Promise<string>;
}

export class AssetPackRepository extends BaseAiRepository implements IAssetPackRepository {
  async generateAssetPackCode(input: AssetPackCodeInput): Promise<string> {
    const bodyPrompt = input.prompt.trim();
    const raw = await this.invokeDomainModel({
      prompt: bodyPrompt,
      trace: input.trace,
      settings: assetPackDomainSettings,
    });

    const code = raw.trim();
    if (!code) throw new Error('empty code');

    return code;
  }
}
