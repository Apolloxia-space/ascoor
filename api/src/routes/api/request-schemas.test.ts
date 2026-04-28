import assert from 'node:assert/strict';
import test from 'node:test';

import { ZodError } from 'zod';

import {
  createAssetPackBodySchema,
  createPackGenerationJobBodySchema,
  reportAssetPackPreviewResultBodySchema,
} from './request-schemas';

test('createPackGenerationJobBodySchema trims prompt input', () => {
  const parsed = createPackGenerationJobBodySchema.parse({
    workspaceId: 'proj-1',
    userPrompt: '  create a bracket  ',
  });

  assert.deepEqual(parsed, {
    workspaceId: 'proj-1',
    userPrompt: 'create a bracket',
  });
});

test('createPackGenerationJobBodySchema rejects unexpected properties', () => {
  assert.throws(
    () =>
      createPackGenerationJobBodySchema.parse({
        workspaceId: 'proj-1',
        userPrompt: 'create a bracket',
        ignored: true,
      }),
    (error: unknown) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.code === 'unrecognized_keys'),
  );
});

test('createAssetPackBodySchema rejects whitespace-only display names', () => {
  assert.throws(
    () =>
      createAssetPackBodySchema.parse({
        workspaceId: 'proj-1',
        displayName: '   ',
      }),
    (error: unknown) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.path[0] === 'displayName'),
  );
});

test('reportAssetPackPreviewResultBodySchema trims the error message', () => {
  const parsed = reportAssetPackPreviewResultBodySchema.parse({
    status: 'failed',
    errorMessage: '  Model failed to render.  ',
  });

  assert.deepEqual(parsed, {
    status: 'failed',
    errorMessage: 'Model failed to render.',
  });
});

test('reportAssetPackPreviewResultBodySchema accepts success without error message', () => {
  const parsed = reportAssetPackPreviewResultBodySchema.parse({
    status: 'succeeded',
  });

  assert.deepEqual(parsed, {
    status: 'succeeded',
  });
});
