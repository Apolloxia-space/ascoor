import type { ResolvedTraceContext } from './runtime';
import { BaseAiRepository } from './base-ai.repository';
import { titleDomainSettings } from './domain-settings';

export type DesignTitleInput = {
  prompt: string;
  trace: ResolvedTraceContext;
};

export interface ITitleRepository {
  designTitle(input: DesignTitleInput): Promise<string>;
}

export class TitleRepository extends BaseAiRepository implements ITitleRepository {
  async designTitle(input: DesignTitleInput): Promise<string> {
    const bodyPrompt = input.prompt.trim();
    const raw = await this.invokeDomainModel({
      prompt: [
        'Design a concise 3D model title for this request.',
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
