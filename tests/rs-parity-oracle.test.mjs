import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { carrylessMultiply, deterministicParityVectors, FIELD_PRESETS, polynomialParity } from './helpers/rs-parity-oracle.mjs';

const root = process.env.QR_ATELIER_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const reference = async name => {
  const loaded = await import(pathToFileURL(resolve(root, 'node_modules/@zxing/library/cjs/core/common/reedsolomon', `${name}.js`)).href);
  return loaded.default.default ?? loaded.default;
};
const [GenericGF, ReedSolomonEncoder] = await Promise.all([reference('GenericGF'), reference('ReedSolomonEncoder')]);

test('hand-computable reductions and degree-one parities distinguish polynomial and generator-start conventions', () => {
  assert.equal(carrylessMultiply(128, 2, FIELD_PRESETS.QR), 0x1d);
  assert.equal(carrylessMultiply(128, 2, FIELD_PRESETS.DM_AZTEC_8), 0x2d);
  assert.equal(carrylessMultiply(32, 2, FIELD_PRESETS.AZTEC_6_MAXICODE), 3);
  assert.equal(carrylessMultiply(2048, 2, FIELD_PRESETS.AZTEC_12), 0x69);
  assert.deepEqual(polynomialParity([1], 1, FIELD_PRESETS.QR), [1]);
  assert.deepEqual(polynomialParity([1], 1, FIELD_PRESETS.DM_AZTEC_8), [2]);
  assert.deepEqual(polynomialParity([0, 0, 0], 5, FIELD_PRESETS.QR), [0, 0, 0, 0, 0]);
  assert.deepEqual(polynomialParity([1, 2], 2, FIELD_PRESETS.QR), [1, 2]);
});

test('all deterministic binary-field parity vectors match the separately maintained ZXing encoder', () => {
  const vectors = deterministicParityVectors();
  assert.equal(vectors.length, 96);
  for (const vector of vectors) {
    const { primitive, fieldSize, generatorBase } = vector.field;
    const input = Int32Array.from([...vector.data, ...new Array(vector.checkWordCount).fill(0)]);
    const before = [...vector.data];
    new ReedSolomonEncoder(new GenericGF(primitive, fieldSize, generatorBase)).encode(input, vector.checkWordCount);
    assert.deepEqual(Array.from(input.slice(vector.data.length)), vector.parity, vector.id);
    assert.deepEqual(vector.data, before, `${vector.id}: reference input mutation`);
  }
  assert.ok(vectors.some(vector => vector.data.some(word => word > 255)));
});

test('reference validation rejects values outside the selected field instead of truncating them', () => {
  for (const field of Object.values(FIELD_PRESETS)) {
    for (const invalid of [[-1], [field.fieldSize], [1.5], [NaN]]) assert.throws(() => polynomialParity(invalid, 2, field), RangeError);
    for (const degree of [0, -1, 1.5, field.fieldSize]) assert.throws(() => polynomialParity([1], degree, field), RangeError);
  }
});
