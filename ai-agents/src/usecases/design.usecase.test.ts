import assert from 'node:assert/strict';
import test from 'node:test';
import type { IDesignRepository } from '../repositories/ai/design.repository';
import type { ITitleRepository } from '../repositories/ai/title.repository';
import { DesignUsecase } from './design.usecase';

test('DesignUsecase.run returns generated code and title', async () => {
  let designCodeCallCount = 0;
  let designPrompt = '';
  let designTitleCallCount = 0;
  let titlePrompt = '';

  const designRepository: IDesignRepository = {
    designCode: async (input) => {
      designCodeCallCount += 1;
      designPrompt = input.prompt;
      return 'const result = new THREE.Group();';
    },
  };

  const titleRepository: ITitleRepository = {
    designTitle: async (input) => {
      designTitleCallCount += 1;
      titlePrompt = input.prompt;
      return 'Model title';
    },
  };

  const usecase = new DesignUsecase(designRepository, titleRepository);
  const result = await usecase.run({
    prompt: 'compiled prompt',
    userPrompt: 'custom user prompt',
    userId: 'user-1',
  });

  assert.equal(result.message, 'Generated a message.');
  assert.equal(result.title, 'Model title');
  assert.equal(result.code, 'const result = new THREE.Group();');
  assert.equal(designCodeCallCount, 1);
  assert.equal(designTitleCallCount, 1);
  assert.equal(designPrompt, 'compiled prompt');
  assert.equal(titlePrompt, 'custom user prompt');
});

test('DesignUsecase.run falls back to compiled prompt for title generation', async () => {
  const designRepository: IDesignRepository = {
    designCode: async () => 'const result = new THREE.Group();',
  };

  let titlePrompt = '';
  const titleRepository: ITitleRepository = {
    designTitle: async (input) => {
      titlePrompt = input.prompt;
      return 'Model title';
    },
  };

  const usecase = new DesignUsecase(designRepository, titleRepository);
  await usecase.run({
    prompt: 'compiled prompt',
    userId: 'user-1',
  });

  assert.equal(titlePrompt, 'compiled prompt');
});
