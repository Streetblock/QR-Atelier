import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeMaxiCodeEci, encodeMaxiCodeStructuredAppend, MaxiCodeCore } from '../libs/MaxiCodeCore.js';
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

test('encodes every MaxiCode ECI assignment-number width at its boundaries', () => {
  assert.deepEqual(encodeMaxiCodeEci(0), [27, 0]);
  assert.deepEqual(encodeMaxiCodeEci(31), [27, 31]);
  assert.deepEqual(encodeMaxiCodeEci(32), [27, 32, 32]);
  assert.deepEqual(encodeMaxiCodeEci(1023), [27, 47, 63]);
  assert.deepEqual(encodeMaxiCodeEci(1024), [27, 48, 16, 0]);
  assert.deepEqual(encodeMaxiCodeEci(32767), [27, 55, 63, 63]);
  assert.deepEqual(encodeMaxiCodeEci(32768), [27, 56, 8, 0, 0]);
  assert.deepEqual(encodeMaxiCodeEci(999999), [27, 59, 52, 8, 63]);
  assert.throws(() => encodeMaxiCodeEci(1000000), /0 to 999999/);
});

test('uses ECI 26 and UTF-8 bytes for Unicode text', () => {
  const text = 'Gr\u00fc\u00dfe';
  const result = new MaxiCodeCore(text, { mode: 4, encoding: 'utf-8' }).generate();
  const utf8Bytes = String.fromCharCode(...new TextEncoder().encode(text));
  const rawBytes = new MaxiCodeCore(utf8Bytes, { mode: 4, eci: 26 }).generate();

  assert.deepEqual(Array.from(result.codewords.slice(1, 3)), [27, 26]);
  assert.deepEqual(result.codewords, rawBytes.codewords);
});

test('places ECI after a structured carrier message header', () => {
  const result = new MaxiCodeCore('[)>\x1e01\x1d96ABC', {
    mode: 2,
    preserveControls: true,
    encoding: 'utf-8',
    postalCode: '12345',
    countryCode: '840',
    serviceClass: '001',
  }).generate();

  assert.deepEqual(Array.from(result.codewords.slice(20, 33)), [59, 42, 41, 59, 40, 30, 48, 49, 29, 57, 54, 27, 26]);
});

test('validates MaxiCode ECI and text encoding combinations', () => {
  assert.throws(
    () => new MaxiCodeCore('€', { mode: 4 }).generate(),
    /cannot be encoded as ISO-8859-1/,
  );
  assert.throws(
    () => new MaxiCodeCore('A', { mode: 4, encoding: 'utf-8', eci: 3 }).generate(),
    /requires ECI assignment number 26/,
  );
  assert.doesNotThrow(() => new MaxiCodeCore('A'.repeat(91), { mode: 4, eci: 26 }).generate());
  assert.throws(
    () => new MaxiCodeCore('A'.repeat(92), { mode: 4, eci: 26 }).generate(),
    /up to 93 codewords/,
  );
});

test('packs MaxiCode Structured Append positions and counts', () => {
  assert.deepEqual(encodeMaxiCodeStructuredAppend({ index: 1, count: 2 }), [33, 1]);
  assert.deepEqual(encodeMaxiCodeStructuredAppend({ index: 3, count: 7 }), [33, 22]);
  assert.deepEqual(encodeMaxiCodeStructuredAppend({ index: 8, count: 8 }), [33, 63]);
  assert.throws(() => encodeMaxiCodeStructuredAppend({ index: 1, count: 1 }), /count.*2 to 8/);
  assert.throws(() => encodeMaxiCodeStructuredAppend({ index: 4, count: 3 }), /index.*1 to 3/);
});

test('places Structured Append before general and carrier messages', () => {
  const general = new MaxiCodeCore('ABC', {
    mode: 4,
    structuredAppend: { index: 3, count: 7 },
  }).generate();
  const carrier = new MaxiCodeCore('ABC', {
    mode: 2,
    structuredAppend: { index: 3, count: 7 },
    postalCode: '12345',
    countryCode: '840',
    serviceClass: '001',
  }).generate();

  assert.deepEqual(Array.from(general.codewords.slice(1, 6)), [33, 22, 1, 2, 3]);
  assert.deepEqual(Array.from(carrier.codewords.slice(20, 25)), [33, 22, 1, 2, 3]);
});

test('keeps Structured Append first when combined with ECI', () => {
  const result = new MaxiCodeCore('ABC', {
    mode: 4,
    eci: 26,
    structuredAppend: { index: 3, count: 7 },
  }).generate();

  assert.deepEqual(Array.from(result.codewords.slice(1, 8)), [33, 22, 27, 26, 1, 2, 3]);
  assert.doesNotThrow(() => new MaxiCodeCore('A'.repeat(91), {
    mode: 4,
    structuredAppend: { index: 1, count: 2 },
  }).generate());
  assert.throws(() => new MaxiCodeCore('A'.repeat(92), {
    mode: 4,
    structuredAppend: { index: 1, count: 2 },
  }).generate(), /up to 93 codewords/);

  const carrier = new MaxiCodeCore('[)>\x1e01\x1d96ABC', {
    mode: 2,
    preserveControls: true,
    encoding: 'utf-8',
    structuredAppend: { index: 3, count: 7 },
    postalCode: '12345',
    countryCode: '840',
    serviceClass: '001',
  }).generate();
  assert.deepEqual(Array.from(carrier.codewords.slice(20, 35)), [
    33, 22, 59, 42, 41, 59, 40, 30, 48, 49, 29, 57, 54, 27, 26,
  ]);
});

test('mode 5 uses enhanced error correction and accepts 77 message codewords', () => {
  const result = new MaxiCodeCore('A'.repeat(77), { mode: 5 }).generate();

  assert.equal(result.mode, 5);
  assert.equal(result.codewords[0] & 0x0f, 5);
  assert.equal(result.codewords.length, 144);
  assert.deepEqual(Array.from(result.codewords.slice(1, 10)), new Array(9).fill(1));
  assert.deepEqual(Array.from(result.codewords.slice(20, 88)), new Array(68).fill(1));
  assert.throws(
    () => new MaxiCodeCore('A'.repeat(78), { mode: 5 }).generate(),
    /up to 77 codewords/,
  );
});

test('mode 6 uses the standard ECC layout for reader programming', () => {
  const readerProgramming = new MaxiCodeCore('ABC', { mode: 6 }).generate();
  const generalPurpose = new MaxiCodeCore('ABC', { mode: 4 }).generate();

  assert.equal(readerProgramming.mode, 6);
  assert.equal(readerProgramming.codewords[0] & 0x0f, 6);
  assert.deepEqual(
    Array.from(readerProgramming.codewords.slice(1, 10)),
    Array.from(generalPurpose.codewords.slice(1, 10)),
  );
  assert.notDeepEqual(
    Array.from(readerProgramming.codewords.slice(10, 20)),
    Array.from(generalPurpose.codewords.slice(10, 20)),
  );
  assert.deepEqual(
    Array.from(readerProgramming.codewords.slice(20)),
    Array.from(generalPurpose.codewords.slice(20)),
  );
});

test('mode 6 supports 93 message codewords and all message controls', () => {
  assert.doesNotThrow(() => new MaxiCodeCore('A'.repeat(93), { mode: 6 }).generate());
  assert.throws(
    () => new MaxiCodeCore('A'.repeat(94), { mode: 6 }).generate(),
    /up to 93 codewords/,
  );
  assert.doesNotThrow(() => new MaxiCodeCore('ABC', {
    mode: 6,
    encoding: 'utf-8',
    structuredAppend: { index: 2, count: 3 },
  }).generate());
});

test('compacts each nine-digit run into an NS block and five value codewords', () => {
  const result = new MaxiCodeCore('123456789', { mode: 4 }).generate();
  const value = 123456789;

  assert.deepEqual(Array.from(result.codewords.slice(1, 7)), [
    31,
    (value >>> 24) & 0x3f,
    (value >>> 18) & 0x3f,
    (value >>> 12) & 0x3f,
    (value >>> 6) & 0x3f,
    value & 0x3f,
  ]);
});

test('uses shortest-path shifts for short Code Set A runs inside Code Set B', () => {
  const result = new MaxiCodeCore('abcBCdef', { mode: 4 }).generate();

  const messagePrefix = [...result.codewords.slice(1, 10), result.codewords[20]];
  assert.deepEqual(messagePrefix, [63, 1, 2, 3, 56, 2, 3, 4, 5, 6]);
});

test('reaches numeric capacity limits after optimal compaction', () => {
  const limits = [
    { options: { mode: 4 }, fits: 138, overflows: 139 },
    { options: { mode: 5 }, fits: 113, overflows: 114 },
    { options: { mode: 6 }, fits: 138, overflows: 139 },
    {
      options: { mode: 2, postalCode: '336091062', countryCode: '840', serviceClass: '002' },
      fits: 123,
      overflows: 124,
    },
    {
      options: { mode: 3, postalCode: 'K1A0B1', countryCode: '124', serviceClass: '001' },
      fits: 123,
      overflows: 124,
    },
  ];

  for (const { options, fits, overflows } of limits) {
    assert.doesNotThrow(() => new MaxiCodeCore('1'.repeat(fits), options).generate());
    assert.throws(
      () => new MaxiCodeCore('1'.repeat(overflows), options).generate(),
      /supports up to \d+ codewords/,
    );
  }
});

test('rejects unsupported MaxiCode modes', () => {
  assert.throws(() => new MaxiCodeCore('A', { mode: 1 }).generate(), /modes 2, 3, 4, 5 and 6/);
  assert.throws(() => new MaxiCodeCore('A', { mode: 7 }).generate(), /modes 2, 3, 4, 5 and 6/);
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

test('zero-fills an unknown US ZIP+4 extension in a Mode 2 Primary Message', () => {
  const postalPositions = [33, 34, 35, 36, 25, 26, 27, 28, 29, 30, 19, 20, 21, 22, 23, 24, 13, 14, 15, 16, 17, 18, 7, 8, 9, 10, 11, 12, 1, 2];
  const lengthPositions = [39, 40, 41, 42, 31, 32];
  const generatePrimary = (postalCode, countryCode) => new MaxiCodeCore('A', {
    mode: 2,
    postalCode,
    countryCode,
    serviceClass: '001',
  }).generate().codewords.slice(0, 10);

  const unknownZip4 = generatePrimary('12345', '840');
  assert.equal(getIntAtPositions(unknownZip4, postalPositions), 123450000);
  assert.equal(getIntAtPositions(unknownZip4, lengthPositions), 9);

  const completeZip4 = generatePrimary('123456789', '840');
  assert.equal(getIntAtPositions(completeZip4, postalPositions), 123456789);
  assert.equal(getIntAtPositions(completeZip4, lengthPositions), 9);

  const nonUsPostalCode = generatePrimary('12345', '276');
  assert.equal(getIntAtPositions(nonUsPostalCode, postalPositions), 12345);
  assert.equal(getIntAtPositions(nonUsPostalCode, lengthPositions), 5);
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
