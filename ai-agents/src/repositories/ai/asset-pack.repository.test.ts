import assert from 'node:assert/strict';
import test from 'node:test';
import type OpenAI from 'openai';
import { AssetPackRepository } from './asset-pack.repository';
import { resolveTraceContext } from './runtime';

function buildMockOpenAiClient(outputText: string): OpenAI {
  return {
    responses: {
      create: async () => ({ output_text: outputText }),
    },
  } as unknown as OpenAI;
}

test('AssetPackRepository.generateAssetPackCode returns generated code', async () => {
  const repository = new AssetPackRepository(
    buildMockOpenAiClient("import * as THREE from 'three';\nconst result = new THREE.Group();"),
  );

  const code = await repository.generateAssetPackCode({
    prompt: 'asset pack',
    trace: resolveTraceContext({ requestId: 'req-1' }),
  });

  assert.equal(code, "import * as THREE from 'three';\nconst result = new THREE.Group();");
});

test('AssetPackRepository.generateAssetPackCode returns valid code', async () => {
  const repository = new AssetPackRepository(
    buildMockOpenAiClient('const result = new THREE.Group();'),
  );

  const code = await repository.generateAssetPackCode({
    prompt: 'asset pack',
    trace: resolveTraceContext({ requestId: 'req-1' }),
  });

  assert.equal(code, 'const result = new THREE.Group();');
});
