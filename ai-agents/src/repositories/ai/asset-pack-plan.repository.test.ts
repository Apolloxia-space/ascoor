import assert from 'node:assert/strict';
import test from 'node:test';
import type OpenAI from 'openai';
import { AssetPackPlanRepository } from './asset-pack-plan.repository';
import { resolveTraceContext } from './runtime';

function buildMockOpenAiClient(outputText: string): OpenAI {
  return {
    responses: {
      create: async () => ({ output_text: outputText }),
    },
  } as unknown as OpenAI;
}

const buildPlanJson = (extraJson = '') => `{
  "title": "Gas Station Pack",
  "message": "Reusable low-poly props.",
  "parts": [
    {
      "slug": "rusty_gas_pump",
      "displayName": "Rusty Gas Pump",
      "description": "A worn gas pump.",
      "prompt": "Create a low-poly rusty gas pump. Do not use Math.PI in JSON metadata."
    },
    {
      "slug": "broken_car",
      "displayName": "Broken Car",
      "description": "A damaged car shell.",
      "prompt": "Create a low-poly broken car."
    },
    {
      "slug": "tire_stack",
      "displayName": "Tire Stack",
      "description": "A stack of old tires.",
      "prompt": "Create a low-poly tire stack."
    }
  ]${extraJson}
}`;

test('AssetPackPlanRepository normalizes parts without stage layout', async () => {
  const repository = new AssetPackPlanRepository(buildMockOpenAiClient(buildPlanJson()));

  const plan = await repository.plan({
    prompt: 'plan a pack',
    trace: resolveTraceContext({ requestId: 'req-1' }),
  });

  assert.equal(plan.parts.length, 3);
  assert.equal(plan.parts[0]?.slug, 'rusty_gas_pump');
});

test('AssetPackPlanRepository ignores legacy stage layout', async () => {
  const repository = new AssetPackPlanRepository(
    buildMockOpenAiClient(
      buildPlanJson(`,
  "stageLayout": [
    {"partSlug": "rusty_gas_pump", "position": [0, 0, 0], "rotation": [0, Math.PI / 4, 0], "scale": [1, 1, 1]},
    {"partSlug": "broken_car", "position": [2, 0, 0], "rotation": [0, -Math.PI / 2, 0], "scale": [1, 1, 1]},
    {"partSlug": "tire_stack", "position": [4, 0, 0], "rotation": [0, Math.PI, 0], "scale": [1, 1, 1]}
  ]`),
    ),
  );

  const plan = await repository.plan({
    prompt: 'plan a pack',
    trace: resolveTraceContext({ requestId: 'req-1' }),
  });

  assert.equal(plan.parts.length, 3);
  assert.equal('stageLayout' in plan, false);
  assert.match(plan.parts[0]?.prompt ?? '', /Math\.PI in JSON metadata/);
});
