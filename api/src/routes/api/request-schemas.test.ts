import assert from 'node:assert/strict';
import test from 'node:test';

import { ZodError } from 'zod';

import { createDesignBodySchema, createDesignJobBodySchema } from './request-schemas';

test('createDesignJobBodySchema trims prompt input', () => {
  const parsed = createDesignJobBodySchema.parse({
    projectId: 'proj-1',
    userPrompt: '  create a bracket  ',
  });

  assert.deepEqual(parsed, {
    projectId: 'proj-1',
    userPrompt: 'create a bracket',
  });
});

test('createDesignJobBodySchema rejects unexpected properties', () => {
  assert.throws(
    () =>
      createDesignJobBodySchema.parse({
        projectId: 'proj-1',
        userPrompt: 'create a bracket',
        ignored: true,
      }),
    (error: unknown) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.code === 'unrecognized_keys'),
  );
});

test('createDesignBodySchema rejects whitespace-only display names', () => {
  assert.throws(
    () =>
      createDesignBodySchema.parse({
        projectId: 'proj-1',
        displayName: '   ',
        type: 'studio_ts',
      }),
    (error: unknown) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.path[0] === 'displayName'),
  );
});
