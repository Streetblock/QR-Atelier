import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { BASELINE_REVISION, CANONICALIZATION, digestResult, generateCase, loadCores, sha256 } from './helpers/encoder-corpus.mjs';

const root = process.env.QR_ATELIER_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const baselineBytes = await readFile(new URL('./fixtures/encoder-baseline-372f456.json', import.meta.url));
const baseline = JSON.parse(baselineBytes.toString('utf8'));
const model1Correction = JSON.parse(await readFile(new URL('./fixtures/qr-model1-version-area-corrections.json', import.meta.url), 'utf8'));
const correctionsById = new Map(model1Correction.corrections.map(item => [item.id, item]));
const cores = await loadCores(root);

test('the pinned previous-output corpus declares exact provenance and complete required coverage', () => {
  assert.equal(sha256(baselineBytes.toString('utf8').replaceAll('\r\n', '\n')), 'bc36b9995e6731ab306f89e4a91c530fd0e160f0b7be8d7896c5a9ade94bf548', 'The previous-output fixture contents must remain unchanged across Git checkout line endings.');
  assert.equal(baseline.format, 'qr-atelier-prior-output-baseline');
  assert.equal(baseline.source.revision, BASELINE_REVISION);
  assert.equal(baseline.canonicalization, CANONICALIZATION);
  assert.equal(correctionsById.size, 32);
  assert.equal(baseline.cases.filter(item => !correctionsById.has(item.id)).length, 721);
  for (const correction of model1Correction.corrections) {
    const original = baseline.cases.find(item => item.id === correction.id);
    assert.ok(original && original.family === 'qr-model-1' && original.options.minVersion >= 7 && original.options.maxVersion <= 14, correction.id);
    assert.deepEqual(correction.originalExpected, original.expected, correction.id);
  }
  assert.equal(new Set(baseline.cases.map(item => item.id)).size, baseline.cases.length);
  const qr = (family, model, maximum) => {
    const forced = baseline.cases.filter(item => item.family === family && item.options.model === model);
    assert.equal(forced.length, maximum * 4);
    for (let version = 1; version <= maximum; version++) for (const level of ['L', 'M', 'Q', 'H']) {
      assert.equal(forced.filter(item => item.options.minVersion === version && item.options.maxVersion === version
        && item.options.errorCorrectionLevel === level && Number.isInteger(item.options.mask)).length, 1);
    }
  };
  qr('qr-model-2', 2, 40); qr('qr-model-1', 1, 14);
  const micro = baseline.cases.filter(item => item.id.startsWith('micro-M'));
  assert.equal(micro.length, 8 * 4);
  assert.equal(new Set(micro.map(item => `${item.options.minVersion}/${item.options.errorCorrectionLevel}`)).size, 8);
  assert.equal(baseline.cases.filter(item => item.id.startsWith('micro-reference-')).length, 9);
  const rmqr = baseline.cases.filter(item => item.id.startsWith('rmqr-R'));
  assert.equal(rmqr.length, 32 * 2);
  assert.equal(new Set(rmqr.map(item => item.options.version)).size, 32);
  for (const [family, count] of [['data-matrix', 30], ['dmre', 18]]) {
    const fixed = baseline.cases.filter(item => item.family === family && item.options.symbolSize && !item.id.startsWith('dm-feature-'));
    assert.equal(fixed.length, count * 2);
    assert.equal(new Set(fixed.map(item => item.options.symbolSize)).size, count);
  }
  assert.equal(baseline.cases.filter(item => item.id.startsWith('aztec-full-layer')).length, 32);
  assert.equal(baseline.cases.filter(item => item.id.startsWith('aztec-compact-layer')).length, 4);
  assert.deepEqual([...new Set(baseline.cases.filter(item => item.family === 'aztec').map(item => item.expected.summary.codewordSize))].sort((a,b) => a-b), [6, 8, 10, 12]);
  assert.deepEqual(baseline.cases.filter(item => item.family === 'aztec-rune').map(item => item.data), Array.from({ length: 256 }, (_, value) => value));
  assert.deepEqual([...new Set(baseline.cases.filter(item => item.family === 'maxicode').map(item => item.options.mode))], [2, 3, 4, 5, 6]);
});

for (const family of ['qr-model-2', 'qr-model-1', 'micro-qr', 'rmqr', 'data-matrix', 'dmre', 'aztec', 'aztec-rune', 'maxicode']) {
  test(`${family} preserves pinned complete results or its explicitly recorded Model 1 correction`, () => {
    const cases = baseline.cases.filter(item => item.family === family);
    assert.ok(cases.length > 0);
    for (const request of cases) {
      const before = structuredClone(request);
      const actual = digestResult(generateCase(cores, request));
      assert.deepEqual(actual, correctionsById.get(request.id)?.expected ?? request.expected, request.id);
      assert.deepEqual(request, before, `${request.id}: input mutation`);
    }
  });
}
