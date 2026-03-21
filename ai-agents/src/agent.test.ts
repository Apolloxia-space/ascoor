import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildThreeJsCompiledPrompt,
  threeJsDesignSystemInstruction,
} from './repositories/threejs-guidelines';

test('threeJsDesignSystemInstruction includes scene-structure output rules', () => {
  assert.match(threeJsDesignSystemInstruction, /Return executable JavaScript only/);
  assert.match(threeJsDesignSystemInstruction, /Assign the final model to `result`/);
  assert.match(threeJsDesignSystemInstruction, /top-level `THREE\.Group`/);
  assert.match(threeJsDesignSystemInstruction, /named `Group` or `Mesh`/);
  assert.match(threeJsDesignSystemInstruction, /readable object hierarchy/);
  assert.match(threeJsDesignSystemInstruction, /X=front\/back, Y=left\/right, Z=up\/down/);
});

test('buildThreeJsCompiledPrompt renders structure rules from the shared source', () => {
  const out = buildThreeJsCompiledPrompt('A modular mecha');

  assert.match(out, /Rules:/);
  assert.match(out, /Build `result` as a top-level `THREE\.Group`/);
  assert.match(out, /Keep each logical part as its own named `Group` or `Mesh` under `result`/);
  assert.match(out, /Prefer local pivots that stay near each part's geometric center/);
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
  assert.match(out, /Return executable JavaScript only/);
  assert.match(out, /Use `THREE` globals and do not include import statements/);
  assert.match(out, /Build `result` as a top-level `THREE\.Group`/);
  assert.match(out, /Keep each logical part as its own named `Group` or `Mesh` under `result`/);
  assert.match(
    out,
    /Preserve a readable object hierarchy instead of collapsing the model into a single unnamed mesh/,
  );
  assert.match(
    out,
    /Prefer local pivots that stay near each part's geometric center so downstream transforms remain usable/,
  );
  assert.match(out, /AXIS CONTRACT: X=front\/back, Y=left\/right, Z=up\/down/);
  assert.match(out, /User request:/);
  assert.match(out, /A simple steam locomotive/);
});
