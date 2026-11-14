import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { BINARY_RS_FIELDS, encodeBinaryReedSolomon } from '../libs/internal/BinaryReedSolomon.js';
import { deterministicParityVectors, polynomialParity } from './helpers/rs-parity-oracle.mjs';

const root = process.env.QR_ATELIER_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const reference = async name => {
  const loaded = await import(pathToFileURL(resolve(root, 'node_modules/@zxing/library/cjs/core/common/reedsolomon', `${name}.js`)).href);
  return loaded.default.default ?? loaded.default;
};
const [GenericGF, ReedSolomonEncoder] = await Promise.all([reference('GenericGF'), reference('ReedSolomonEncoder')]);
const presets = [...new Set(Object.values(BINARY_RS_FIELDS))];
const fieldFor = referenceField => presets.find(field => field.fieldSize === referenceField.fieldSize
  && field.primitive === referenceField.primitive && field.generatorBase === referenceField.generatorBase);

function zxingParity(data, degree, field) {
  const encoded = Int32Array.from([...data, ...new Array(degree).fill(0)]);
  new ReedSolomonEncoder(new GenericGF(field.primitive, field.fieldSize, field.generatorBase)).encode(encoded, degree);
  return Array.from(encoded.slice(data.length));
}

function seededWords(seed, count, fieldSize) {
  const words = [];
  let state = seed >>> 0;
  for (let index = 0; index < count; index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    words.push((state >>> 8) % fieldSize);
  }
  return words;
}

test('fixed field presets are immutable and aliases reuse the same six arithmetic fields', () => {
  assert.equal(presets.length, 6);
  assert.ok(Object.isFrozen(BINARY_RS_FIELDS));
  for (const field of presets) assert.ok(Object.isFrozen(field));
  assert.equal(BINARY_RS_FIELDS.DATA_MATRIX, BINARY_RS_FIELDS.AZTEC_8);
  assert.equal(BINARY_RS_FIELDS.MAXICODE, BINARY_RS_FIELDS.AZTEC_6);
  assert.throws(() => { BINARY_RS_FIELDS.AZTEC_8.primitive = 0x11d; }, TypeError);
  assert.throws(() => { BINARY_RS_FIELDS.EXTRA = {}; }, TypeError);
  assert.throws(() => encodeBinaryReedSolomon([1], 1, { ...BINARY_RS_FIELDS.QR_256 }), TypeError);
});

test('known small parity vectors retain polynomial, generator-start and coefficient-order conventions', () => {
  assert.deepEqual(encodeBinaryReedSolomon([1], 1, BINARY_RS_FIELDS.QR_256), [1]);
  assert.deepEqual(encodeBinaryReedSolomon([1], 1, BINARY_RS_FIELDS.DATA_MATRIX), [2]);
  assert.deepEqual(encodeBinaryReedSolomon([1, 2], 2, BINARY_RS_FIELDS.QR_256), [1, 2]);
  assert.deepEqual(encodeBinaryReedSolomon([0, 0, 0], 5, BINARY_RS_FIELDS.DATA_MATRIX), [0, 0, 0, 0, 0]);
  assert.deepEqual(encodeBinaryReedSolomon([128], 1, BINARY_RS_FIELDS.DATA_MATRIX), [0x2d]);
  assert.deepEqual(encodeBinaryReedSolomon([2048], 1, BINARY_RS_FIELDS.AZTEC_12), [0x69]);
});

test('pinned multicodeword parity vectors retain the independently generated ZXing 0.23 results', () => {
  // Captured directly from ZXing GenericGF/ReedSolomonEncoder, not from this
  // module or the polynomial oracle. Keep leading parity zeros significant.
  const known = [
    ['QR_256', [0, 1, 2, 3, 254, 255], [122, 20, 135, 93, 181]],
    ['AZTEC_4', [0, 1, 2, 3, 14, 15], [1, 8, 4, 4, 10]],
    ['AZTEC_6', [0, 1, 2, 3, 62, 63], [14, 40, 54, 2, 57]],
    ['AZTEC_8', [0, 1, 2, 3, 254, 255], [151, 116, 3, 147, 60]],
    ['AZTEC_10', [0, 1, 2, 3, 1022, 1023], [849, 849, 14, 78, 943]],
    ['AZTEC_12', [0, 1, 2, 3, 4094, 4095], [0, 1877, 1226, 1908, 2938]],
  ];
  for (const [name, data, expected] of known) {
    const field = BINARY_RS_FIELDS[name];
    assert.deepEqual(encodeBinaryReedSolomon(data, 5, field), expected, name);
    assert.deepEqual(polynomialParity(data, 5, field), expected, `${name}: polynomial oracle`);
    assert.deepEqual(zxingParity(data, 5, field), expected, `${name}: pinned independent encoder`);
  }
});

test('zero, leading-zero, maximum and mixed vectors match both independent polynomial division and ZXing', () => {
  const vectors = deterministicParityVectors();
  assert.equal(vectors.length, 96);
  for (const vector of vectors) {
    const field = fieldFor(vector.field);
    assert.ok(field, vector.id);
    const input = Object.freeze([...vector.data]);
    assert.deepEqual(encodeBinaryReedSolomon(input, vector.checkWordCount, field), vector.parity, vector.id);
    assert.deepEqual(encodeBinaryReedSolomon(input, vector.checkWordCount, field), zxingParity(input, vector.checkWordCount, field), vector.id);
    assert.deepEqual(input, vector.data, `${vector.id}: changed input`);
  }
});

test('seeded inputs and varying parity degrees match independent encoders in every field', () => {
  let count = 0;
  for (const field of presets) for (let seed = 1; seed <= 32; seed++) {
    const degree = 1 + ((seed * 17 + 3) % Math.min(68, field.fieldSize - 2));
    const length = Math.min(1 + (seed * 31) % 123, field.fieldSize - 1 - degree);
    const words = seededWords(seed, length, field.fieldSize);
    const actual = encodeBinaryReedSolomon(words, degree, field);
    assert.deepEqual(actual, polynomialParity(words, degree, field), `${field.name} seed ${seed}: polynomial oracle`);
    assert.deepEqual(actual, zxingParity(words, degree, field), `${field.name} seed ${seed}: ZXing`);
    assert.equal(actual.length, degree);
    count++;
  }
  assert.equal(count, 192);
});

test('large layer-dependent Aztec check counts remain exact through full layer 32', () => {
  for (const [field, degree] of [[BINARY_RS_FIELDS.AZTEC_6, 44], [BINARY_RS_FIELDS.AZTEC_8, 237],
    [BINARY_RS_FIELDS.AZTEC_10, 1018], [BINARY_RS_FIELDS.AZTEC_12, 1662]]) {
    const data = [0, field.fieldSize - 1];
    const actual = encodeBinaryReedSolomon(data, degree, field);
    assert.equal(actual.length, degree);
    assert.deepEqual(actual, zxingParity(data, degree, field), `${field.name} degree ${degree}`);
  }
});

test('input and returned parity mutations cannot modify cached generators or earlier results', () => {
  for (const field of presets) {
    const input = Uint16Array.from([0, 1, field.fieldSize - 1, 2]);
    const before = Array.from(input);
    const expected = polynomialParity(before, 5, field);
    const first = encodeBinaryReedSolomon(input, 5, field);
    assert.deepEqual(Array.from(input), before);
    first.fill(0);
    const retained = encodeBinaryReedSolomon(input, 5, field);
    assert.deepEqual(retained, expected);
    input[0] = 1;
    assert.deepEqual(encodeBinaryReedSolomon(input, 5, field), polynomialParity(Array.from(input), 5, field));
    assert.deepEqual(retained, expected, 'Later input changes and encoder calls must not alter an earlier result.');
  }
});

test('validation rejects invalid data and degrees without truncation or custom-field caches', () => {
  for (const field of presets) {
    for (const invalid of [[], [-1], [field.fieldSize], [1.5], [NaN], [Infinity], new Array(2), BigInt64Array.of(1n)]) {
      assert.throws(() => encodeBinaryReedSolomon(invalid, 2, field), RangeError);
    }
    for (const invalid of [null, {}, 'ABC', new Set([1]), new DataView(new ArrayBuffer(8))]) {
      assert.throws(() => encodeBinaryReedSolomon(invalid, 2, field), TypeError);
    }
    for (const degree of [0, -1, 1.5, NaN, Infinity, field.fieldSize]) {
      assert.throws(() => encodeBinaryReedSolomon([1], degree, field), RangeError);
    }
  }
});

test('private field tables are lazy and generator storage is exact-degree bounded LRU state', async () => {
  // Append a controlled private read hook only to this isolated test module.
  // The production module exposes no cache state or reset API.
  const source = await readFile(new URL('../libs/internal/BinaryReedSolomon.js', import.meta.url), 'utf8');
  const hook = '\nexport const __cacheForTest = () => Array.from(fieldStates, ([field, state]) => ({ name: field.name, exponentWords: state.exponents.length, logWords: state.logarithms.length, degrees: [...state.generators.keys()], cachedWords: state.cachedWords }));';
  const isolated = await import(`data:text/javascript;base64,${Buffer.from(source + hook).toString('base64')}`);
  assert.deepEqual(isolated.__cacheForTest(), []);
  assert.throws(() => isolated.encodeBinaryReedSolomon([256], 2, isolated.BINARY_RS_FIELDS.QR_256), RangeError);
  assert.deepEqual(isolated.__cacheForTest(), []);
  for (let degree = 1; degree <= 12; degree++) isolated.encodeBinaryReedSolomon([1], degree, isolated.BINARY_RS_FIELDS.QR_256);
  let qr = isolated.__cacheForTest().find(state => state.name === 'QR_256');
  assert.equal(qr.exponentWords, 510); assert.equal(qr.logWords, 256);
  assert.deepEqual(qr.degrees, [5, 6, 7, 8, 9, 10, 11, 12]);
  isolated.encodeBinaryReedSolomon([1], 5, isolated.BINARY_RS_FIELDS.QR_256);
  isolated.encodeBinaryReedSolomon([1], 13, isolated.BINARY_RS_FIELDS.QR_256);
  qr = isolated.__cacheForTest().find(state => state.name === 'QR_256');
  assert.deepEqual(qr.degrees, [7, 8, 9, 10, 11, 12, 5, 13]);
  for (let degree = 1199; degree <= 1206; degree++) isolated.encodeBinaryReedSolomon([1], degree, isolated.BINARY_RS_FIELDS.AZTEC_12);
  const aztec = isolated.__cacheForTest().find(state => state.name === 'AZTEC_12');
  assert.equal(aztec.exponentWords, 8190); assert.equal(aztec.logWords, 4096);
  assert.ok(aztec.degrees.length <= 8); assert.ok(aztec.cachedWords <= 8192);
  assert.equal(aztec.cachedWords, aztec.degrees.reduce((sum, degree) => sum + degree, 0));
  assert.ok(aztec.degrees.every(degree => degree >= 1199), 'No unrequested generator prefixes may be retained.');
  isolated.encodeBinaryReedSolomon([1], 5, isolated.BINARY_RS_FIELDS.DATA_MATRIX);
  isolated.encodeBinaryReedSolomon([1], 7, isolated.BINARY_RS_FIELDS.AZTEC_8);
  assert.equal(isolated.__cacheForTest().filter(state => state.name === 'AZTEC_8').length, 1);
  assert.deepEqual(isolated.__cacheForTest().find(state => state.name === 'AZTEC_8').degrees, [5, 7]);
});
