import type { AiDomainSettings } from '../../entities/ai-domain';
import { threeJsDesignSystemInstruction } from '../threejs-guidelines';

export const designDomainSettings: AiDomainSettings = {
  stage: 'design',
  modelProfile: 'primary',
  systemInstruction: threeJsDesignSystemInstruction,
};

export const titleDomainSettings: AiDomainSettings = {
  stage: 'design_title',
  modelProfile: 'secondary',
};
