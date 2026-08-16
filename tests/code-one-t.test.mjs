import test from 'node:test'
import assert from 'node:assert/strict'
import { CodeOneCore } from '../libs/CodeOneCore.js'
import { CodeOneSvgRenderer } from '../libs/CodeOneSvg.js'

const references = new Map([
  ['ABCDEFGHIJKLM', [
    '11100101111100110', '01101001010011101', '00101000001011001', '01000000011110011',
    '10010100010001011', '10101110001001010', '00101001001001110', '01101110011001011',
    '01111001001110011', '10000001001101001', '00000000100000000', '11111111111111111',
    '10000000000000001', '10111111111111101', '10000000000000001', '10111111111111101',
  ]],
  ['ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGH', [
    '111001011110011010010100001011001', '011010011001110100100000011110011',
    '100110101101101100001110001001110', '101001100101101000000110110110000',
    '100011111010011000101011110000100', '011000110111000000010001111011001',
    '010000111111100101010011010011101', '010110011111011000010111100011110',
    '000110111101100001011011000011000', '101111100010010000100011100000110',
    '000000000000000010000000000000000', '111111111111111111111111111111111',
    '100000000000000010000000000000001', '101111111111111111111111111111101',
    '100000000000000000000000000000001', '101111111111111111111111111111101',
  ]],
  ['ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC', [
    '1110010111100110001010001010110011001101011011011',
    '0110100110011101010000000111100111010011001011010',
    '0001110001001110100011110101001100101011110001000',
    '0000110110110000011000110011100000010001111010110',
    '1100100100001010001111000011111011011111011101111',
    '1000101000111101111000000100100110100011011110110',
    '0000010001110011111001000001000010101000001001110',
    '0000010010111000001000100100111111001101000110011',
    '0101010011001000001111000100101010001011010001111',
    '1100010001111110010001100010011010010011101100110',
    '0000000000000000000000001000000000000000000000000',
    '1111111111111111111111111111111111111111111111111',
    '1000000000000000000000001000000000000000000000001',
    '1011111111111111111111111111111111111111111111101',
    '1000000000000000000000001000000000000000000000001',
    '1011111111111111111111111111111111111111111111101',
  ]],
])

test('matches official Zint/AIM Version T matrices bit for bit', () => {
  for (const [data, expected] of references) {
    const symbol = new CodeOneCore(data, { version: 'T' }).generate()
    assert.deepEqual(symbol.modules.map(row => row.map(Number).join('')), expected)
  }
})

test('supports the full 90-digit T-48 decimal capacity', () => {
  const data = '1234567890'.repeat(9)
  const symbol = new CodeOneCore(data, { version: 'T' }).generate()
  assert.equal(symbol.version, 'T-48')
  assert.equal(symbol.encodingMode, 'decimal')
  assert.equal(symbol.dataCodewords.length, 38)
  assert.deepEqual(symbol.modules.map(row => row.map(Number).join('')), [
    '1111111111001100100011011011010101110100010111110',
    '0001000110010101000001010101001110001111010000011',
    '0111000100011001010100000010110100111000111101000',
    '1011111111001100100011010011010101110100010111110',
    '0011101111111100110010000110101101010111010001011',
    '0111000100011001010100000010110100111000111101000',
    '1110011111101101100001000001001100101010010111010',
    '0011101111100111100011110011101001101100010110101',
    '0011110011111001001110110011010010001001010011011',
    '1000100101011101110111000000111110000010001000010',
    '0000000000000000000000001000000000000000000000000',
    '1111111111111111111111111111111111111111111111111',
    '1000000000000000000000001000000000000000000000001',
    '1011111111111111111111111111111111111111111111101',
    '1000000000000000000000001000000000000000000000001',
    '1011111111111111111111111111111111111111111111101',
  ])
})

test('selects and validates forced Version T sizes', () => {
  assert.equal(new CodeOneCore('ABC', { version: 'T' }).generate().version, 'T-16')
  assert.equal(new CodeOneCore('ABC', { version: 'T-32' }).generate().version, 'T-32')
  assert.throws(() => new CodeOneCore('?'.repeat(11), { version: 'T-16' }).generate(), /input requires 11/)
  assert.throws(() => new CodeOneCore('\u20ac', { version: 'T' }).generate(), /Latin-1/)
  assert.throws(() => new CodeOneCore('1'.repeat(91), { version: 'T' }).generate(), /at most 90/)
})

test('supports every general high-level mode in Version T', () => {
  const cases = [
    ['ascii', 'A?'],
    ['c40', 'ABCDEFGHIJKLM'],
    ['text', 'abcdefghijklm'],
    ['edi', '\r*>\r*>'],
    ['decimal', '1234567890123'],
    ['byte', '\x80\x80'],
  ]
  for (const [mode, data] of cases) {
    const symbol = new CodeOneCore(data, { version: 'T', mode }).generate()
    assert.equal(symbol.encodingMode, mode)
    assert.equal(symbol.height, 16)
  }
})

test('supports GS1, ECI and Structured Append in Version T', () => {
  const gs1 = new CodeOneCore(`0104912345123459\x1d10ABC`, { version: 'T', gs1: true }).generate()
  assert.equal(gs1.dataCodewords[0], 232)
  assert.ok(gs1.dataCodewords.includes(232, 1))

  const eci = new CodeOneCore('Grüße', { version: 'T', encoding: 'utf-8', eci: 26 }).generate()
  assert.equal(eci.eci, 26)
  assert.deepEqual(eci.dataCodewords.slice(0, 3), [129, 93, 93])

  const sequence = new CodeOneCore('ABCDEFGHIJ', {
    version: 'T',
    structuredAppend: { index: 1, count: 15 },
  }).generate()
  assert.deepEqual(sequence.structuredAppend, { index: 1, count: 15 })
  assert.deepEqual(sequence.dataCodewords.slice(0, 2), [14, 233])
})

test('renders Version T with its rectangular aspect ratio', () => {
  const symbol = new CodeOneCore('ABCDEFGHIJKLM', { version: 'T' }).generate()
  const svg = new CodeOneSvgRenderer(symbol, { size: 170 }).render()
  assert.match(svg, /width="170"/)
  assert.match(svg, /viewBox="0 0 21 20"/)
  assert.match(svg, /aria-label="Code One T-16"/)
})
