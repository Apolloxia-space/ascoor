import type { AiDomainSettings } from '../../entities/ai-domain';
import { threeJsDesignSystemInstruction } from '../threejs-guidelines';

const assetPackPlanSystemInstruction = [
  'Return valid JSON only.',
  'Do not include markdown fences or explanations.',
  'Plan a low-poly game asset pack as separate reusable parts, not as one merged scene.',
  'Use 3 to 8 parts.',
  'Each part must be a standalone game prop with a clear slug, displayName, description, and prompt.',
  'Every part prompt must ask for executable Three.js code using THREE globals, no imports, and final assignment to result.',
  'Do not include stageLayout; the application will arrange parts in a preview layout automatically.',
  'If you include any numeric value, it must be a JSON number literal only. Never use JavaScript expressions such as Math.PI, Infinity, NaN, or arithmetic.',
  'JSON shape: {"title": string, "message": string, "parts": [{"slug": string, "displayName": string, "description": string, "prompt": string}]}.',
] as const;

export const designDomainSettings: AiDomainSettings = {
  stage: 'design',
  modelProfile: 'primary',
  systemInstruction: threeJsDesignSystemInstruction,
};

export const titleDomainSettings: AiDomainSettings = {
  stage: 'design_title',
  modelProfile: 'secondary',
};

export const assetPackPlanDomainSettings: AiDomainSettings = {
  stage: 'asset_pack_plan',
  modelProfile: 'secondary',
  systemInstruction: assetPackPlanSystemInstruction.join(' '),
};
