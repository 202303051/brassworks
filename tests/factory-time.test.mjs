import assert from 'node:assert/strict';
import test from 'node:test';
import { formatFactoryDate, formatFactoryTime } from '../src/lib/factory-time.js';

const dateCases = [
  ['before midnight in IST', '2026-11-11T18:29:59Z', '11/11/2026'],
  ['at midnight in IST', '2026-11-11T18:30:00Z', '12/11/2026'],
  ['month boundary', '2026-01-31T18:30:00Z', '01/02/2026'],
  ['year boundary', '2026-12-31T18:30:00Z', '01/01/2027'],
  ['leap day', '2024-02-28T18:30:00Z', '29/02/2024'],
  ['explicit IST offset', '2026-11-12T00:00:00+05:30', '12/11/2026'],
  ['negative offset', '2026-11-11T23:00:00-05:00', '12/11/2026'],
];

for (const [name, instant, expected] of dateCases) {
  test(`factory date: ${name}`, () => {
    assert.equal(formatFactoryDate(instant), expected);
  });
}

test('factory clock uses 00:00 at midnight', () => {
  assert.equal(formatFactoryTime('2026-11-11T18:30:00Z'), '00:00');
});

test('factory clock converts a negative offset', () => {
  assert.equal(formatFactoryTime('2026-11-11T23:00:00-05:00'), '09:30');
});

test('reject missing timezone and date-only values', () => {
  for (const value of ['2026-11-11', '2026-11-11T14:00:00', '']) {
    assert.throws(() => formatFactoryDate(value), RangeError);
  }
});

test('reject non-string and hostile timestamp inputs', () => {
  for (const value of [
    null,
    undefined,
    0,
    {},
    [],
    '<script>alert(1)</script>',
    '😀',
    'x'.repeat(100000),
  ]) {
    assert.throws(() => formatFactoryDate(value), RangeError);
  }
});

test('reject invalid month and impossible calendar dates', () => {
  for (const value of ['2026-13-01T00:00:00Z', '2026-02-30T00:00:00Z', '2025-02-29T00:00:00Z']) {
    assert.throws(() => formatFactoryDate(value), RangeError);
  }
});
