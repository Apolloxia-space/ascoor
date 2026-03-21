import assert from 'node:assert/strict';
import test from 'node:test';
import type OpenAI from 'openai';
import { DesignRepository } from './design.repository';
import { resolveTraceContext } from './runtime';

function buildMockOpenAiClient(outputText: string): OpenAI {
  return {
    responses: {
      create: async () => ({ output_text: outputText }),
    },
  } as unknown as OpenAI;
}

test('DesignRepository.designCode returns generated code', async () => {
  const repository = new DesignRepository(
    buildMockOpenAiClient("import * as THREE from 'three';\nconst result = new THREE.Group();"),
  );

  const code = await repository.designCode({
    prompt: 'design model',
    trace: resolveTraceContext({ requestId: 'req-1' }),
  });

  assert.equal(code, "import * as THREE from 'three';\nconst result = new THREE.Group();");
});

test('DesignRepository.designCode returns valid code', async () => {
  const repository = new DesignRepository(
    buildMockOpenAiClient('const result = new THREE.Group();'),
  );

  const code = await repository.designCode({
    prompt: 'design model',
    trace: resolveTraceContext({ requestId: 'req-1' }),
  });

  assert.equal(code, 'const result = new THREE.Group();');
});
