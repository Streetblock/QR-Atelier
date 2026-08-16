import assert from 'node:assert/strict';
import test from 'node:test';

import { HanXinCore } from '../libs/HanXinCore.js';
import { compactHanXin, unicodeToGb18030 } from '../libs/HanXinCompaction.js';
import { HanXinSvgRenderer } from '../libs/HanXinSvg.js';
import { HAN_XIN_DATA_CODEWORDS, HAN_XIN_TOTAL_CODEWORDS } from '../libs/HanXinTables.js';

function matrixStrings(result) {
  return result.modules.map((row) => row.map(Number).join(''));
}

function assertShape(result) {
  assert.equal(result.size, result.version * 2 + 21);
  assert.equal(result.modules.length, result.size);
  for (const row of result.modules) {
    assert.equal(row.length, result.size);
    for (const module of row) assert.equal(typeof module, 'boolean');
  }
}

test('matches the ISO/IEC 20830 Annex K numeric symbol reproduced by Zint', () => {
  const result = new HanXinCore('1234567890', { version: 1, errorCorrection: 'L1', mask: 0 }).generate();
  assert.deepEqual(matrixStrings(result), [
    '11111110100010101111111', '10000000000100100000001', '10111110000000101111101',
    '10100000001110000000101', '10101110111010101110101', '10101110000000001110101',
    '10101110000110001110101', '00000000001000100000000', '00010101000000100000000',
    '00011000101000000000100', '00000000000000001111000', '00000111101000000000000',
    '00000000000000000000001', '11010110000000010110100', '00000000100000010101000',
    '00000000100001000000000', '11111110010100001110101', '00000010000000001110101',
    '11111010100000101110101', '00001010000111000000101', '11101010101000001111101',
    '11101010100000000000001', '11101010100000101111111',
  ]);
  assert.deepEqual(result.dataCodewords.slice(0, 8), [0x11, 0xed, 0xc8, 0xc5, 0x40, 0x0f, 0xf4, 0]);
});

test('automatic masking matches the Annex K mask 01 symbol', () => {
  const result = new HanXinCore('1234567890', { version: 1, errorCorrection: 'L1' }).generate();
  assert.equal(result.mask, 1);
  assert.deepEqual(matrixStrings(result), [
    '11111110001000001111111', '10000000110001100000001', '10111110001010101111101',
    '10100000111011100000101', '10101110010000101110101', '10101110110101001110101',
    '10101110001100001110101', '00000000011101100000000', '00010101001010011000000',
    '01001101111101010101110', '10101010101010100101101', '01010010111101010101010',
    '10101010101010101010100', '10000011010101000011110', '00000011001010010101000',
    '00000000110100000000000', '11111110011110001110101', '00000010010101101110101',
    '11111010101010001110101', '00001010110010100000101', '11101010100010001111101',
    '11101010110101100000001', '11101010001010001111111',
  ]);
});

test('selects numeric, text, binary and Chinese compaction modes', () => {
  assert.equal(new HanXinCore('1234567890').generate().segments[0].name, 'numeric');
  assert.equal(new HanXinCore('HanXin').generate().segments[0].name, 'text');
  assert.equal(new HanXinCore(Uint8Array.of(0x80)).generate().segments[0].name, 'binary');
  assert.equal(new HanXinCore('汉信码').generate().segments[0].name, 'region-one');
  assert.equal(new HanXinCore('\u{1F642}').generate().segments[0].name, 'four-byte');
});

test('encodes GS1 framing and numeric data exactly', () => {
  const result = new HanXinCore('0109506000134352', {
    gs1: true,
    version: 3,
    errorCorrection: 'L1',
    mask: 0,
  }).generate();
  assert.equal(result.gs1, true);
  assert.equal(result.bitLength, 90);
  assert.deepEqual(result.dataCodewords.slice(0, 12), [
    0xe1, 0x10, 0x2b, 0xb6, 0x96, 0x00, 0xd6, 0xcc, 0x02, 0xff, 0x7f, 0xc0,
  ]);
  assert.deepEqual(result.segments.map(({ name, length }) => ({ name, length })), [
    { name: 'numeric', length: 16 },
  ]);
});

test('merges a GS1 separator efficiently across numeric segment boundaries', () => {
  const result = new HanXinCore('123456789\x1d789012', {
    gs1: true,
    version: 3,
    errorCorrection: 'L1',
    mask: 0,
  }).generate();
  assert.equal(result.bitLength, 90);
  assert.deepEqual(result.dataCodewords.slice(0, 12), [
    0xe1, 0x11, 0xed, 0xc8, 0xc5, 0x7e, 0x8c, 0x54, 0x0c, 0xff, 0xff, 0xc0,
  ]);
  assert.deepEqual(result.segments.map(({ name, length }) => ({ name, length })), [
    { name: 'numeric', length: 9 },
    { name: 'gs1-separator', length: 1 },
    { name: 'numeric', length: 6 },
  ]);
});

test('uses only normative Text and extended Numeric segments inside GS1', () => {
  const result = new HanXinCore('10ABC\x1d21XYZ', { gs1: true }).generate();
  assert.deepEqual(result.segments.map(({ name }) => name), ['text', 'gs1-separator', 'numeric', 'text']);
  assert.equal(result.gs1, true);
});

test('matches the first normative GS1 Numeric-to-Text bit stream', () => {
  const input = '01034531200000111719112510ABCD1234';
  const expected = [
    '11100001',
    '0001', ...[10, 345, 312, 0, 1, 117, 191, 125, 10, 1022].map((value) => value.toString(2).padStart(10, '0')),
    '0010', ...[10, 11, 12, 13, 1, 2, 3, 4, 63].map((value) => value.toString(2).padStart(6, '0')),
    '11111111',
  ].join('');
  assert.equal(compactHanXin([...Buffer.from(input)], { gs1: true }).bits.map(Number).join(''), expected);
});

test('encodes FNC1 through the normative Text-to-extended-Numeric transition', () => {
  const expected = [
    '11100001',
    '0010', ...[10, 63].map((value) => value.toString(2).padStart(6, '0')),
    '0001', ...[1000, 211, 0, 1021].map((value) => value.toString(2).padStart(10, '0')),
    '11111111',
  ].join('');
  const compacted = compactHanXin([...Buffer.from('A\x1d2110')], { gs1: true });
  assert.equal(compacted.bits.map(Number).join(''), expected);
  assert.deepEqual(compacted.segments.map(({ mode }) => mode), ['t', 'g', 'n']);
});

test('rejects malformed or unsupported GS1 input', () => {
  assert.throws(() => new HanXinCore('\x1d0109506000134352', { gs1: true }).generate(), /separators/);
  assert.throws(() => new HanXinCore('10ABC\x1d', { gs1: true }).generate(), /separators/);
  assert.throws(() => new HanXinCore('10ABC\x1d\x1d21XYZ', { gs1: true }).generate(), /separators/);
  assert.throws(() => new HanXinCore('10ABC\x1dXYZ', { gs1: true }).generate(), /application identifier/);
  assert.throws(() => new HanXinCore('汉', { gs1: true }).generate(), /ASCII/);
  assert.throws(() => new HanXinCore('0109506000134352', { gs1: true, eci: 3 }).generate(), /ECI/);
  assert.throws(() => new HanXinCore('0109506000134352', { gs1: 'yes' }).generate(), /boolean/);
});

test('encodes a common URL with the exact URI-A bit stream', () => {
  const text = 'https://example.com';
  const compacted = compactHanXin([...Buffer.from(text)], { uri: true });
  const expected = [
    '11100010', '001', '110010', '000100', '010111', '000000', '001100',
    '001111', '001011', '000100', '111001', '111111', '111',
  ].join('');
  assert.equal(compacted.bits.map(Number).join(''), expected);
  assert.deepEqual(compacted.segments.map(({ mode, length }) => ({ mode, length })), [
    { mode: 'ua', length: text.length },
  ]);
});

test('uses URI-C for short mixed-case data and compacts percent-encoded bytes', () => {
  const mixed = new HanXinCore('aA', { uri: true }).generate();
  assert.equal(mixed.uri, true);
  assert.equal(mixed.bitLength, 35);
  assert.equal(compactHanXin([0x61, 0x41], { uri: true }).bits.map(Number).join(''),
    ['11100010', '011', '0000000', '0011010', '1111111', '111'].join(''));
  assert.deepEqual(mixed.segments.map(({ name }) => name), ['uri-c']);

  const url = 'https://example.com/%E2%82%AC';
  const result = new HanXinCore(url, { uri: true }).generate();
  assert.equal(result.bitLength, 115);
  assert.deepEqual(result.segments.map(({ name, length }) => ({ name, length })), [
    { name: 'uri-a', length: 20 },
    { name: 'uri-percent', length: 9 },
  ]);
  assert.ok(compactHanXin([...Buffer.from(url)], { uri: true }).bits.map(Number).join('').endsWith(
    ['111111', '100', '00000011', '11100010', '10000010', '10101100', '111'].join('')));
  assert.ok(result.bitLength < new HanXinCore(url).generate().bitLength);
});

test('uses the compact URI-A and URI-B jump codes in both directions', () => {
  const result = new HanXinCore('aaaaaaaaaaAaaaaaaaaaa', { uri: true }).generate();
  assert.deepEqual(result.segments.map(({ name, length }) => ({ name, length })), [
    { name: 'uri-a', length: 10 },
    { name: 'uri-b', length: 1 },
    { name: 'uri-a', length: 10 },
  ]);
  assert.equal(result.bitLength, 158);
});

test('validates URI mode combinations and character set', () => {
  assert.throws(() => new HanXinCore('https://example.com', { uri: true, eci: 3 }).generate(), /ECI/);
  assert.throws(() => new HanXinCore('https://example.com', { uri: true, gs1: true }).generate(), /cannot be combined/);
  assert.throws(() => new HanXinCore('https://example.com', { uri: 'yes' }).generate(), /boolean/);
  assert.throws(() => new HanXinCore('https://example.com/ä', { uri: true }).generate(), /ASCII/);
  assert.throws(() => new HanXinCore('https://example.com/a b', { uri: true }).generate(), /character sets/);
});

test('matches independent Han Xin Unicode reference codewords', () => {
  const vectors = [
    ['A', [0x91, 0x10, 0x41, 0xf0]],
    ['Привет', [0x92, 0x61, 0x6d, 0x08, 0x03, 0xf0, 0x1c, 0x32, 0x6b, 0x0b, 0xc0]],
    ['🙂', [0x91, 0x47, 0x82, 0xdc, 0x74, 0xb8, 0x0f]],
  ];
  for (const [text, expected] of vectors) {
    const result = new HanXinCore(text, { unicode: true, version: 10, errorCorrection: 'L1', mask: 0 }).generate();
    assert.deepEqual(result.dataCodewords.slice(0, expected.length), expected);
    assert.equal(result.unicode, true);
    assert.equal(result.encoding, 'UTF-8');
  }
});

test('uses Unicode byte-column compression and variable-length group counters', () => {
  const repeated = new HanXinCore('a'.repeat(12), { unicode: true }).generate();
  assert.equal(repeated.bitLength, 32);
  assert.deepEqual(repeated.segments.map(({ name, byteWidth, count, length }) => ({ name, byteWidth, count, length })), [
    { name: 'unicode-1-byte', byteWidth: 1, count: 12, length: 12 },
  ]);
  assert.equal(new HanXinCore('a'.repeat(7), { unicode: true }).generate().bitLength, 28);
  assert.equal(new HanXinCore('a'.repeat(8), { unicode: true }).generate().bitLength, 32);

  const cyrillic = new HanXinCore('Привет', { unicode: true }).generate();
  assert.deepEqual(cyrillic.segments.map(({ name, byteWidth, count }) => ({ name, byteWidth, count })), [
    { name: 'unicode-2-byte', byteWidth: 2, count: 6 },
  ]);
  assert.ok(cyrillic.bitLength < new HanXinCore('Привет').generate().bitLength);
  assert.equal(new HanXinCore('汉'.repeat(6), { unicode: true }).generate().segments[0].name, 'unicode-3-byte');
  assert.equal(new HanXinCore('🙂'.repeat(6), { unicode: true }).generate().segments[0].name, 'unicode-4-byte');
});

test('validates Unicode input and mutually exclusive specialized modes', () => {
  assert.throws(() => new HanXinCore(Uint8Array.of(0x41), { unicode: true }).generate(), /string input/);
  assert.throws(() => new HanXinCore('\ud800', { unicode: true }).generate(), /unpaired surrogate/);
  assert.throws(() => new HanXinCore('text', { unicode: 'yes' }).generate(), /boolean/);
  assert.throws(() => new HanXinCore('text', { unicode: true, eci: 26 }).generate(), /ECI/);
  assert.throws(() => new HanXinCore('text', { unicode: true, gs1: true }).generate(), /cannot be combined/);
  assert.throws(() => new HanXinCore('text', { unicode: true, uri: true }).generate(), /cannot be combined/);
});

test('maps representative Unicode points to GB18030 without a runtime codec', () => {
  assert.deepEqual(unicodeToGb18030(0x41), [0x41]);
  assert.deepEqual(unicodeToGb18030('汉'.codePointAt(0)), [0xbaba]);
  assert.deepEqual(unicodeToGb18030(0x1f642), [0x9530, 0x8532]);
});

test('supports every version and all four error-correction levels', () => {
  for (let version = 1; version <= 84; version++) {
    const result = new HanXinCore('1', { version, errorCorrection: `L${version % 4 + 1}`, mask: 0 }).generate();
    assert.equal(result.version, version);
    assert.equal(result.codewords.length, HAN_XIN_TOTAL_CODEWORDS[version - 1]);
    assert.equal(result.dataCodewords.length, HAN_XIN_DATA_CODEWORDS[version % 4][version - 1]);
    assertShape(result);
  }
});

test('validates forced versions, ECC levels, masks, ECI and overflow', () => {
  assert.throws(() => new HanXinCore('x', { version: 0 }).generate(), /version/);
  assert.throws(() => new HanXinCore('x', { errorCorrection: 'L5' }).generate(), /errorCorrection/);
  assert.throws(() => new HanXinCore('x', { mask: 4 }).generate(), /mask/);
  assert.throws(() => new HanXinCore('x', { eci: 1_000_000 }).generate(), /ECI/);
  assert.throws(() => new HanXinCore('A'.repeat(30), { version: 1, errorCorrection: 'L4' }).generate(), /requires/);
  assert.throws(() => new HanXinCore('').generate(), /must not be empty/);
});

test('generation is deterministic and exposes RS block metadata', () => {
  const options = { errorCorrection: 'L3', version: 8 };
  const first = new HanXinCore('Han Xin 汉信 1234567890', options).generate();
  const second = new HanXinCore('Han Xin 汉信 1234567890', options).generate();
  assert.deepEqual(first.modules, second.modules);
  assert.deepEqual(first.codewords, second.codewords);
  assert.ok(first.blocks.length > 1);
  assert.equal(first.codewords.length, first.capacity.totalCodewords);
});

test('renders a dependency-free, crisp SVG with a quiet zone', () => {
  const result = new HanXinCore('Han Xin').generate();
  const svg = new HanXinSvgRenderer(result, { scale: 3, margin: 3 }).render();
  assert.match(svg, /^<svg/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.match(svg, /aria-label="Han Xin code"/);
  assert.match(svg, new RegExp(`width="${(result.size + 6) * 3}"`));
});
