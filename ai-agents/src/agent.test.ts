import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildThreeJsCompiledPrompt,
  threeJsAssetPackSystemInstruction,
} from './repositories/threejs-guidelines';

test('threeJsAssetPackSystemInstruction keeps minimal runtime constraints plus naming', () => {
  assert.match(threeJsAssetPackSystemInstruction, /Return executable JavaScript only/);
  assert.match(threeJsAssetPackSystemInstruction, /THREE core API only/);
  assert.match(threeJsAssetPackSystemInstruction, /Use `THREE` globals and do not include import statements/);
  assert.match(threeJsAssetPackSystemInstruction, /Do not include markdown fences or explanations/);
  assert.match(threeJsAssetPackSystemInstruction, /Assign the final model to `result`/);
  assert.match(
    threeJsAssetPackSystemInstruction,
    /Give every major `Group` or `Mesh` a short descriptive `name` based on its role/,
  );
  assert.doesNotMatch(threeJsAssetPackSystemInstruction, /Ascoor, a 3D asset pack studio/);
  assert.doesNotMatch(threeJsAssetPackSystemInstruction, /structure tree and transform controls/);
  assert.doesNotMatch(threeJsAssetPackSystemInstruction, /X=front\/back, Y=left\/right, Z=up\/down/);
});

test('buildThreeJsCompiledPrompt renders the minimal user request template', () => {
  const out = buildThreeJsCompiledPrompt('A modular mecha');

  assert.match(out, /Write three\.js code that creates the object requested below/);
  assert.match(out, /User request:/);
  assert.doesNotMatch(out, /Rules:/);
  assert.doesNotMatch(out, /Build `result` as a top-level `THREE\.Group`/);
  assert.match(out, /A modular mecha/);
});

test('runCompilePrompt returns the minimal template', async () => {
  process.env.OPENAI_API_KEY ??= 'test-key';
  const { runCompilePrompt } = await import('./agent');
  const out = await runCompilePrompt({
    userPrompt: 'A simple steam locomotive',
  });

  assert.doesNotMatch(out, /buildStepTarget/);
  assert.match(out, /Write three\.js code that creates the object requested below/);
  assert.match(out, /User request:/);
  assert.doesNotMatch(out, /Rules:/);
  assert.doesNotMatch(out, /Build `result` as a top-level `THREE\.Group`/);
  assert.match(out, /A simple steam locomotive/);
});
