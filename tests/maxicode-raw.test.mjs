import assert from 'node:assert/strict';
import test from 'node:test';
import { MaxiCodeCore } from '../libs/MaxiCodeCore.js';
import { parseMaxiCodeRawInput } from '../libs/MaxiCodeRaw.js';

test('parses bcgen decimal escapes and named control aliases', () => {
  assert.equal(
    parseMaxiCodeRawInput('[)>~03001<GS>96~029840<RS><EOT>'),
    '[)>\x1e01\x1d96\x1d840\x1e\x04',
  );
});

test('uses a doubled tilde for a literal tilde', () => {
  assert.equal(parseMaxiCodeRawInput('A~~B'), 'A~B');
});

test('rejects decimal escapes outside the byte range', () => {
  assert.throws(() => parseMaxiCodeRawInput('~999'), /outside the byte range/);
});

test('mode 4 preserves raw CR, GS, RS and EOT controls', () => {
  const raw = parseMaxiCodeRawInput('A~013B~029C~030D~004');
  const result = new MaxiCodeCore(raw, { mode: 4, preserveControls: true }).generate();

  assert.equal(result.mode, 4);
  assert.equal(result.data, 'A\rB\x1dC\x1eD\x04');
  assert.equal(result.codewords.length, 144);
});

const getIntAtPositions = (bytes, positions) => positions.reduce((value, position) => {
  const bitNumber = position - 1;
  const bit = (bytes[Math.floor(bitNumber / 6)] >> (5 - (bitNumber % 6))) & 1;
  return (value << 1) | bit;
}, 0);

test('packs a numeric postal code into a Mode 2 Primary Message', () => {
  const result = new MaxiCodeCore('ABC', {
    mode: 2,
    postalCode: '336091062',
    countryCode: '840',
    serviceClass: '002',
  }).generate();
  const primary = result.codewords.slice(0, 10);

  assert.equal(primary[0] & 0x0f, 2);
  assert.equal(getIntAtPositions(primary, [33, 34, 35, 36, 25, 26, 27, 28, 29, 30, 19, 20, 21, 22, 23, 24, 13, 14, 15, 16, 17, 18, 7, 8, 9, 10, 11, 12, 1, 2]), 336091062);
  assert.equal(getIntAtPositions(primary, [39, 40, 41, 42, 31, 32]), 9);
  assert.equal(getIntAtPositions(primary, [53, 54, 43, 44, 45, 46, 47, 48, 37, 38]), 840);
  assert.equal(getIntAtPositions(primary, [55, 56, 57, 58, 59, 60, 49, 50, 51, 52]), 2);
  assert.deepEqual(Array.from(result.codewords.slice(20, 23)), [1, 2, 3]);
});

test('packs six alphanumeric postal characters into a Mode 3 Primary Message', () => {
  const result = new MaxiCodeCore('ABC', {
    mode: 3,
    postalCode: 'K1A0B1',
    countryCode: '124',
    serviceClass: '001',
  }).generate();
  const primary = result.codewords.slice(0, 10);
  const positions = [
    [39, 40, 41, 42, 31, 32],
    [33, 34, 35, 36, 25, 26],
    [27, 28, 29, 30, 19, 20],
    [21, 22, 23, 24, 13, 14],
    [15, 16, 17, 18, 7, 8],
    [9, 10, 11, 12, 1, 2],
  ];

  assert.equal(primary[0] & 0x0f, 3);
  assert.deepEqual(positions.map((field) => getIntAtPositions(primary, field)), [11, 49, 1, 48, 2, 49]);
  assert.equal(getIntAtPositions(primary, [53, 54, 43, 44, 45, 46, 47, 48, 37, 38]), 124);
  assert.equal(getIntAtPositions(primary, [55, 56, 57, 58, 59, 60, 49, 50, 51, 52]), 1);
});

test('validates Mode 2 and Mode 3 primary fields', () => {
  assert.throws(
    () => new MaxiCodeCore('A', { mode: 2, postalCode: 'ABC', countryCode: '840', serviceClass: '001' }).generate(),
    /1 to 9 digits/,
  );
  assert.throws(
    () => new MaxiCodeCore('A', { mode: 3, postalCode: 'K1A0B', countryCode: '124', serviceClass: '001' }).generate(),
    /exactly 6 alphanumeric/,
  );
});

test('fits the Stack Overflow UPS routing and Format 07 sample in a Mode 2 secondary message', () => {
  const secondary = parseMaxiCodeRawInput(
    `[)>~03001~029961Z50978063~029UPSN~029123123~03007G:%"6*AH537&M9&QXP2E:)16(E&539R'64O~030~004`,
  );
  const result = new MaxiCodeCore(secondary, {
    mode: 2,
    preserveControls: true,
    postalCode: '116352242',
    countryCode: '480',
    serviceClass: '003',
  }).generate();

  assert.equal(result.mode, 2);
  assert.equal(result.data, `[)>\x1e01\x1d961Z50978063\x1dUPSN\x1d123123\x1e07G:%"6*AH537&M9&QXP2E:)16(E&539R'64O\x1e\x04`);
  assert.equal(result.codewords.length, 144);
});
