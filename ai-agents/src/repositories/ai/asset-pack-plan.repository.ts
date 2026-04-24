import type { AssetPackPlan } from '../../entities/asset-pack-plan';
import { assetPackPlanSchema } from '../../entities/asset-pack-plan';
import type { ResolvedTraceContext } from './runtime';
import { BaseAiRepository } from './base-ai.repository';
import { assetPackPlanDomainSettings } from './domain-settings';

export type AssetPackPlanInput = {
  prompt: string;
  trace: ResolvedTraceContext;
};

export interface IAssetPackPlanRepository {
  plan(input: AssetPackPlanInput): Promise<AssetPackPlan>;
}

const extractJsonObject = (input: string) => {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] ?? trimmed).trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error('empty asset pack plan');
  }
  return source.slice(start, end + 1);
};

const formatNumberLiteral = (value: number) => {
  const rounded = Number(value.toFixed(6));
  return Number.isFinite(rounded) ? String(rounded) : '0';
};

const replaceMathPiExpressions = (input: string) =>
  input.replace(/[+-]?\s*Math\.PI(?:\s*[*/]\s*[+-]?\d+(?:\.\d+)?)?/g, (match) => {
    const expression = match.replace(/\s+/g, '');
    const parsed = expression.match(/^([+-]?)(Math\.PI)(?:([*/])([+-]?\d+(?:\.\d+)?))?$/);
    if (!parsed) return match;

    const sign = parsed[1] === '-' ? -1 : 1;
    const operator = parsed[3];
    const operand = parsed[4] ? Number(parsed[4]) : null;
    if (operand !== null && !Number.isFinite(operand)) return match;

    let value = sign * Math.PI;
    if (operator === '/') {
      value = operand === 0 ? 0 : value / (operand ?? 1);
    } else if (operator === '*') {
      value *= operand ?? 1;
    }

    return formatNumberLiteral(value);
  });

const normalizeJsonExpressions = (input: string) => {
  let output = '';
  let segment = '';
  let inString = false;
  let escaped = false;

  for (const char of input) {
    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      output += replaceMathPiExpressions(segment);
      segment = '';
      output += char;
      inString = true;
      continue;
    }

    segment += char;
  }

  return output + replaceMathPiExpressions(segment);
};

const normalizeSlug = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
  return normalized || fallback;
};

const normalizePlan = (value: AssetPackPlan): AssetPackPlan => {
  const used = new Set<string>();
  const parts = value.parts.map((part, index) => {
    const baseSlug = normalizeSlug(part.slug, `part_${index + 1}`);
    let slug = baseSlug;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${baseSlug}_${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return {
      ...part,
      slug,
      displayName: part.displayName.trim(),
      description: part.description.trim(),
      prompt: part.prompt.trim(),
    };
  });

  return {
    title: value.title.trim(),
    message: value.message.trim(),
    parts,
  };
};

export class AssetPackPlanRepository extends BaseAiRepository implements IAssetPackPlanRepository {
  async plan(input: AssetPackPlanInput): Promise<AssetPackPlan> {
    const raw = await this.invokeDomainModel({
      prompt: input.prompt.trim(),
      trace: input.trace,
      settings: assetPackPlanDomainSettings,
    });

    const json = normalizeJsonExpressions(extractJsonObject(raw));
    const parsed = assetPackPlanSchema.parse(JSON.parse(json));
    return normalizePlan(parsed);
  }
}
