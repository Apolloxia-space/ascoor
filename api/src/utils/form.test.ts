import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeRequiredFormValue } from './form';

test('normalizeRequiredFormValue trims surrounding whitespace', () => {
  const value = normalizeRequiredFormValue('  bracket  ', {
    field: 'displayName',
    maxChars: 300,
    errorFactory: (message) => new Error(message),
  });

  assert.equal(value, 'bracket');
});

test('normalizeRequiredFormValue rejects whitespace-only values', () => {
  assert.throws(
    () =>
      normalizeRequiredFormValue('   ', {
        field: 'displayName',
        maxChars: 300,
        errorFactory: (message) => new Error(message),
      }),
    /displayName is required/,
  );
});

test('normalizeRequiredFormValue rejects values above the maximum length after trimming', () => {
  assert.throws(
    () =>
      normalizeRequiredFormValue(` ${'x'.repeat(301)} `, {
        field: 'displayName',
        maxChars: 300,
        errorFactory: (message) => new Error(message),
      }),
    /displayName must be at most 300 characters/,
  );
});
