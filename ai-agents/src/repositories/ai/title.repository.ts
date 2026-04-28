import type { ResolvedTraceContext } from './runtime';
import { BaseAiRepository } from './base-ai.repository';
import { titleDomainSettings } from './domain-settings';

export type AssetPackTitleInput = {
  prompt: string;
  trace: ResolvedTraceContext;
};

export interface ITitleRepository {
  generateTitle(input: AssetPackTitleInput): Promise<string>;
}

export class TitleRepository extends BaseAiRepository implements ITitleRepository {
  async generateTitle(input: AssetPackTitleInput): Promise<string> {
    const bodyPrompt = input.prompt.trim();
    const raw = await this.invokeDomainModel({
      prompt: [
        'Create a concise asset pack title for this request.',
        'Return only the title text in one line.',
        'Keep it under 8 words.',
        '',
        `User request: ${bodyPrompt}`,
      ].join('\n'),
      trace: input.trace,
      settings: titleDomainSettings,
    });

    const title = raw.trim().split('\n')[0] ?? '';
    if (!title) throw new Error('empty title');
    return title;
  }
}
