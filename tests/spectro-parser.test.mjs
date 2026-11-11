import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSpectroText } from '../src/features/factory/spectro-parser.js';
import { validateSpectroPhoto } from '../src/features/factory/spectro-ocr.js';

test('spectro rows map all five printed element values', () => {
  assert.deepEqual(
    parseSpectroText('Cu 58.20 %\nZn 39.00 %\nPb 2.50 %\nFe 0.10 %\nSn 0.20 %').values,
    { cu: 58.2, zn: 39, pb: 2.5, fe: 0.1, sn: 0.2 },
  );
});
test('horizontal spectro table maps labels to the next values row', () => {
  assert.deepEqual(parseSpectroText('Cu Zn Pb Fe Sn\n58.2 39 2.5 0.1 0.2').values, {
    cu: 58.2,
    zn: 39,
    pb: 2.5,
    fe: 0.1,
    sn: 0.2,
  });
});
test('inline chemistry, full names and decimal commas are recognized', () => {
  assert.deepEqual(parseSpectroText('Copper: 58,2 Zinc: 39 Lead: 2,5 Iron: 0,1 Tin: 0,2').values, {
    cu: 58.2,
    zn: 39,
    pb: 2.5,
    fe: 0.1,
    sn: 0.2,
  });
});
test('ppm is explicitly converted to percent and scientific notation is accepted', () => {
  assert.deepEqual(parseSpectroText('Pb 25000 ppm\nFe 1e-1 %').values, { pb: 2.5, fe: 0.1 });
});
test('less-than, negative and out-of-range results are not assigned', () => {
  const result = parseSpectroText('Cu 101\nPb <0.001\nFe -2');
  assert.deepEqual(result.values, {});
  assert.ok(result.warnings.length >= 3);
});
test('conflicting repeated results need review while exact duplicates remain usable', () => {
  const result = parseSpectroText('Cu 58.2\nCu 59.3\nZn 39\nZn 39');
  assert.deepEqual(result.values, { zn: 39 });
  assert.deepEqual(result.candidates.cu, [58.2, 59.3]);
  assert.match(result.warnings.join(' '), /multiple different/);
});
test('missing elements are never invented and unknown elements are ignored', () => {
  assert.deepEqual(parseSpectroText('Cu 58.2 %\nNi 0.1 %\nAl 0.02 %').values, { cu: 58.2 });
  assert.deepEqual(parseSpectroText('Nothing readable here').values, {});
});
test('vertical labels can precede their readings on the next line', () => {
  assert.deepEqual(parseSpectroText('Cu\n58.2 %\nZn\n39 %').values, { cu: 58.2, zn: 39 });
});
test('multi-column result rows are treated as ambiguous', () => {
  assert.deepEqual(parseSpectroText('Cu 58.2 58.3 58.4').values, {});
});
test('oversized text and invalid images fail before OCR', () => {
  assert.throws(() => parseSpectroText(null), /invalid/);
  assert.throws(() => parseSpectroText('x'.repeat(100001)), /too large/);
  for (const file of [
    null,
    { type: 'image/svg+xml', size: 100 },
    { type: 'image/png', size: 0 },
    { type: 'image/jpeg', size: 16 * 1024 * 1024 },
  ])
    assert.throws(() => validateSpectroPhoto(file));
  assert.doesNotThrow(() => validateSpectroPhoto({ type: 'image/jpeg', size: 2000 }));
});
