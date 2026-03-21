import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildThreeJsCompiledPrompt,
  threeJsDesignSystemInstruction,
} from './repositories/threejs-guidelines';

test('threeJsDesignSystemInstruction includes Ascoor runtime constraints', () => {
  assert.match(threeJsDesignSystemInstruction, /Ascoor, a 3D design studio/);
  assert.match(threeJsDesignSystemInstruction, /structure tree and transform controls/);
  assert.match(threeJsDesignSystemInstruction, /Keep the output compatible with that edit flow/);
  assert.match(threeJsDesignSystemInstruction, /Return executable JavaScript only/);
  assert.match(threeJsDesignSystemInstruction, /Assign the final model to `result`/);
  assert.match(threeJsDesignSystemInstruction, /X=front\/back, Y=left\/right, Z=up\/down/);
  assert.match(threeJsDesignSystemInstruction, /Add this exact top comment in output/);
});

test('buildThreeJsCompiledPrompt renders structure rules from the shared source', () => {
  const out = buildThreeJsCompiledPrompt('A modular mecha');

  assert.match(out, /Rules:/);
  assert.match(
    out,
    /Create a simple 3D model in three\.js that is clearly recognizable as the requested object/,
  );
  assert.match(out, /Build `result` as a top-level `THREE\.Group`/);
  assert.match(out, /Keep a shallow, editable hierarchy/);
  assert.match(
    out,
    /Split only major editable or functional parts into named `Group` or `Mesh` nodes under `result`/,
  );
  assert.match(out, /Prefer local pivots for major editable parts/);
  assert.doesNotMatch(out, /structure tree and transform controls/);
  assert.doesNotMatch(out, /Return executable JavaScript only/);
  assert.match(out, /A modular mecha/);
});

test('runCompilePrompt returns template with coordinate and axis constraints', async () => {
  process.env.OPENAI_API_KEY ??= 'test-key';
  const { runCompilePrompt } = await import('./agent');
  const out = await runCompilePrompt({
    userPrompt: 'A simple steam locomotive',
  });

  assert.doesNotMatch(out, /buildStepTarget/);
  assert.match(out, /Rules:/);
  assert.match(out, /Build `result` as a top-level `THREE\.Group`/);
  assert.match(out, /clearly recognizable as the requested object/);
  assert.match(out, /Keep a shallow, editable hierarchy/);
  assert.match(
    out,
    /Split only major editable or functional parts into named `Group` or `Mesh` nodes under `result`/,
  );
  assert.match(
    out,
    /Collapse minor static details into their parent part when reasonable/,
  );
  assert.match(
    out,
    /If recognizability and fine-grained structure conflict, prefer recognizability with fewer, larger parts/,
  );
  assert.doesNotMatch(out, /structure tree and transform controls/);
  assert.doesNotMatch(out, /Return executable JavaScript only/);
  assert.match(out, /User request:/);
  assert.match(out, /A simple steam locomotive/);
});
