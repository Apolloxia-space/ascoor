import { DesignRepository } from './repositories/ai/design.repository';
import { TitleRepository } from './repositories/ai/title.repository';
import { PromptCompileRepository } from './repositories/prompt-compile.repository';
import { DesignUsecase } from './usecases/design.usecase';
import { PromptCompileUsecase } from './usecases/prompt-compile.usecase';
import { TitleUsecase } from './usecases/title.usecase';
import OpenAI from 'openai';

export type AgentDependencies = {
  designUsecase: DesignUsecase;
  titleUsecase: TitleUsecase;
  promptCompileUsecase: PromptCompileUsecase;
};

const openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function createDependencies(): AgentDependencies {
  const designRepository = new DesignRepository(openAiClient);
  const titleRepository = new TitleRepository(openAiClient);
  const promptCompileRepository = new PromptCompileRepository();

  return {
    designUsecase: new DesignUsecase(designRepository, titleRepository),
    titleUsecase: new TitleUsecase(titleRepository),
    promptCompileUsecase: new PromptCompileUsecase(promptCompileRepository),
  };
}
