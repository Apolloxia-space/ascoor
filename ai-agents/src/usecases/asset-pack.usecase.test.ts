import assert from 'node:assert/strict';
import test from 'node:test';
import type { IAssetPackRepository } from '../repositories/ai/asset-pack.repository';
import type { ITitleRepository } from '../repositories/ai/title.repository';
import { AssetPackUsecase } from './asset-pack.usecase';

test('AssetPackUsecase.run returns generated code and title', async () => {
  let generateAssetPackCodeCallCount = 0;
  let assetPackPrompt = '';
  let generateTitleCallCount = 0;
  let titlePrompt = '';

  const assetPackRepository: IAssetPackRepository = {
    generateAssetPackCode: async (input) => {
      generateAssetPackCodeCallCount += 1;
      assetPackPrompt = input.prompt;
      return 'const result = new THREE.Group();';
    },
  };

  const titleRepository: ITitleRepository = {
    generateTitle: async (input) => {
      generateTitleCallCount += 1;
      titlePrompt = input.prompt;
      return 'Model title';
    },
  };

  const usecase = new AssetPackUsecase(assetPackRepository, titleRepository);
  const result = await usecase.run({
    prompt: 'compiled prompt',
    userPrompt: 'custom user prompt',
    userId: 'user-1',
  });

  assert.equal(result.message, 'Generated a message.');
  assert.equal(result.title, 'Model title');
  assert.equal(result.code, 'const result = new THREE.Group();');
  assert.equal(generateAssetPackCodeCallCount, 1);
  assert.equal(generateTitleCallCount, 1);
  assert.equal(assetPackPrompt, 'compiled prompt');
  assert.equal(titlePrompt, 'custom user prompt');
});

test('AssetPackUsecase.run falls back to compiled prompt for title generation', async () => {
  const assetPackRepository: IAssetPackRepository = {
    generateAssetPackCode: async () => 'const result = new THREE.Group();',
  };

  let titlePrompt = '';
  const titleRepository: ITitleRepository = {
    generateTitle: async (input) => {
      titlePrompt = input.prompt;
      return 'Model title';
    },
  };

  const usecase = new AssetPackUsecase(assetPackRepository, titleRepository);
  await usecase.run({
    prompt: 'compiled prompt',
    userId: 'user-1',
  });

  assert.equal(titlePrompt, 'compiled prompt');
});
