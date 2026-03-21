import type { ResolvedTraceContext } from './runtime';
import { BaseAiRepository } from './base-ai.repository';
import { designDomainSettings } from './domain-settings';

export type DesignCodeInput = {
  prompt: string;
  trace: ResolvedTraceContext;
};

export interface IDesignRepository {
  designCode(input: DesignCodeInput): Promise<string>;
}

export class DesignRepository extends BaseAiRepository implements IDesignRepository {
  async designCode(input: DesignCodeInput): Promise<string> {
    const bodyPrompt = input.prompt.trim();
    const raw = await this.invokeDomainModel({
      prompt: bodyPrompt,
      trace: input.trace,
      settings: designDomainSettings,
    });

    const code = raw.trim();
    if (!code) throw new Error('empty code');

    return code;
  }
}
