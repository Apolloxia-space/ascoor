import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBooleanEnv, parsePositiveNumberEnv, trimToNull } from './env';

test('parsePositiveNumberEnv returns fallback for invalid values', () => {
  assert.equal(parsePositiveNumberEnv(undefined, 10), 10);
  assert.equal(parsePositiveNumberEnv('', 10), 10);
  assert.equal(parsePositiveNumberEnv('-1', 10), 10);
  assert.equal(parsePositiveNumberEnv('abc', 10), 10);
  assert.equal(parsePositiveNumberEnv('20', 10), 20);
});

test('parseBooleanEnv supports trim and empty handling options', () => {
  assert.equal(parseBooleanEnv(undefined, true), true);
  assert.equal(parseBooleanEnv('', true), true);
  assert.equal(parseBooleanEnv('false', true), false);
  assert.equal(parseBooleanEnv(' true ', false), false);
  assert.equal(parseBooleanEnv(' true ', false, { trim: true }), true);
  assert.equal(parseBooleanEnv('', true, { fallbackOnEmpty: false }), false);
});

test('trimToNull returns null for empty-like values', () => {
  assert.equal(trimToNull(undefined), null);
  assert.equal(trimToNull(null), null);
  assert.equal(trimToNull(''), null);
  assert.equal(trimToNull('   '), null);
  assert.equal(trimToNull(' value '), 'value');
});
