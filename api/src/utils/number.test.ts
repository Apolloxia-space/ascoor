import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePositiveInt } from './number';

test('normalizePositiveInt normalizes with default and max', () => {
  assert.equal(normalizePositiveInt(undefined, { defaultValue: 10 }), 10);
  assert.equal(normalizePositiveInt(0, { defaultValue: 10 }), 10);
  assert.equal(normalizePositiveInt(3.9, { defaultValue: 10 }), 3);
  assert.equal(normalizePositiveInt(999, { defaultValue: 10, max: 100 }), 100);
  assert.equal(normalizePositiveInt(50, { defaultValue: 10, max: 100 }), 50);
});
