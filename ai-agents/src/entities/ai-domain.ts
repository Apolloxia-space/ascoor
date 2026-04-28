// Domain entity for AI domain model invocation settings
export type AiDomainStage = 'asset_pack' | 'asset_pack_title' | 'compile_prompt' | 'asset_pack_plan';
export type AiDomainModelProfile = 'primary' | 'secondary';

export type AiDomainSettings = {
  stage: AiDomainStage;
  modelProfile?: AiDomainModelProfile;
  systemInstruction?: string;
};
