// Domain entity for AI domain model invocation settings
export type AiDomainStage = 'design' | 'design_title' | 'compile_prompt';
export type AiDomainModelProfile = 'primary' | 'secondary';

export type AiDomainSettings = {
  stage: AiDomainStage;
  modelProfile?: AiDomainModelProfile;
  systemInstruction?: string;
};
