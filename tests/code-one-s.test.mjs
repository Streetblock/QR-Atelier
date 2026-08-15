import test from 'node:test'
import assert from 'node:assert/strict'
import { CodeOneCore } from '../libs/CodeOneCore.js'
import { CodeOneSvgRenderer } from '../libs/CodeOneSvg.js'

const references = new Map([
  ['123456', '00011110000|11000010001|10100011100|11000011000|00000000000|11111111111|10000000001|10111111101'],
  ['123456789012', '000101110111000010010|110101100101011000101|100000101001110101100|010110101001010001000|000000000010000000000|111111111111111111111|100000000000000000001|101111111111111111101'],
  ['123456789012345678', '0000110111010011100000001111001|1110100011011100110110110010111|1111100010010100111000011001010|1101100000010010010111110001110|0000000000000001000000000000000|1111111111111111111111111111111|1000000000000001000000000000001|1011111111111111111111111111101'],
])

test('matches Zint/AIM Version S matrices bit for bit', () => {
  for (const [data, expected] of references) {
    const symbol = new CodeOneCore(data).generate()
    assert.equal(symbol.modules.map(row => row.map(Number).join('')).join('|'), expected)
  }
})

test('selects S-10, S-20 and S-30 at exact boundaries', () => {
  assert.equal(new CodeOneCore('1'.repeat(6)).generate().version, 'S-10')
  assert.equal(new CodeOneCore('1'.repeat(7)).generate().version, 'S-20')
  assert.equal(new CodeOneCore('1'.repeat(13)).generate().version, 'S-30')
})

test('validates numeric input and forced versions', () => {
  assert.throws(() => new CodeOneCore('ABC').generate(), /decimal digits/)
  assert.throws(() => new CodeOneCore('1'.repeat(19)).generate(), /1 to 18/)
  assert.throws(() => new CodeOneCore('1234567', { version: 'S-10' }).generate(), /at most 6/)
})

test('renders the rectangular matrix as SVG', () => {
  const symbol = new CodeOneCore('406990').generate()
  const svg = new CodeOneSvgRenderer(symbol).render()
  assert.match(svg, /aria-label="Code One S-10"/)
  assert.equal((svg.match(/<rect /g) || []).length, symbol.modules.flat().filter(Boolean).length + 1)
})
