import { AssetPackRepository } from './repositories/ai/asset-pack.repository';
import { AssetPackPlanRepository } from './repositories/ai/asset-pack-plan.repository';
import { TitleRepository } from './repositories/ai/title.repository';
import { PromptCompileRepository } from './repositories/prompt-compile.repository';
import { AssetPackPlanUsecase } from './usecases/asset-pack-plan.usecase';
import { AssetPackUsecase } from './usecases/asset-pack.usecase';
import { PromptCompileUsecase } from './usecases/prompt-compile.usecase';
import { TitleUsecase } from './usecases/title.usecase';
import OpenAI from 'openai';

export type AgentDependencies = {
  assetPackPlanUsecase: AssetPackPlanUsecase;
  assetPackUsecase: AssetPackUsecase;
  titleUsecase: TitleUsecase;
  promptCompileUsecase: PromptCompileUsecase;
};

const openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function createDependencies(): AgentDependencies {
  const assetPackPlanRepository = new AssetPackPlanRepository(openAiClient);
  const assetPackRepository = new AssetPackRepository(openAiClient);
  const titleRepository = new TitleRepository(openAiClient);
  const promptCompileRepository = new PromptCompileRepository();

  return {
    assetPackPlanUsecase: new AssetPackPlanUsecase(assetPackPlanRepository),
    assetPackUsecase: new AssetPackUsecase(assetPackRepository, titleRepository),
    titleUsecase: new TitleUsecase(titleRepository),
    promptCompileUsecase: new PromptCompileUsecase(promptCompileRepository),
  };
}
