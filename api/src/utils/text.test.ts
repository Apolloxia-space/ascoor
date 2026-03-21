import assert from 'node:assert/strict';
import test from 'node:test';
import { collapseWhitespace, truncateText } from './text';

test('truncateText truncates with default suffix', () => {
  assert.equal(truncateText('hello', 10), 'hello');
  assert.equal(truncateText('abcdefghij123', 10), 'abcdefghij...<truncated>');
  assert.equal(truncateText('', 10), '');
  assert.equal(truncateText('hello', 0), '...<truncated>');
});

test('truncateText supports custom suffix', () => {
  assert.equal(truncateText('abcdefghij123', 10, '...'), 'abcdefghij...');
});

test('collapseWhitespace normalizes repeated spaces and line breaks', () => {
  assert.equal(collapseWhitespace('  a   b\nc\t d  '), 'a b c d');
});
