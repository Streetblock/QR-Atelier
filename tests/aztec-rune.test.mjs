import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecRuneCore } from '../libs/AztecRuneCore.js'
import { AztecSvgRenderer } from '../libs/AztecSvg.js'
import { formatRegistry } from '../formats/index.js'

const ISO_FIGURE_A1 = new Map([
  [0, '11101010101|11111111111|01000000010|11011111011|01010001010|11010101011|01010001010|11011111011|01000000010|01111111111|00101010100'],
  [25, '11101100101|11111111111|01000000011|01011111011|01010001010|11010101011|11010001011|11011111010|11000000011|01111111111|00100100000'],
  [125, '11110101101|11111111111|11000000011|11011111011|01010001010|01010101010|01010001011|01011111011|11000000010|01111111111|00111101000'],
  [255, '11010101001|11111111111|01000000011|11011111011|11010001011|01010101011|01010001010|11011111011|11000000010|01111111111|00110011100'],
])

test('matches all four ISO/IEC 24778 Annex A Figure A.1 runes', () => {
  for (const [value, expected] of ISO_FIGURE_A1) {
    const rune = new AztecRuneCore(value).generate()
    assert.equal(rune.size, 11)
    assert.equal(rune.modules.map(row => row.map(Number).join('')).join('|'), expected)
    assert.equal(rune.modeMessageBits.length, 28)
    assert.equal(rune.checkWords.length, 5)
  }
})

test('accepts decimal strings and rejects values outside 0 through 255', () => {
  assert.equal(new AztecRuneCore('025').generate().value, 25)
  for (const invalid of ['', '1.5', 'A', '-1', '0001', 256, -1, 1.5]) {
    assert.throws(() => new AztecRuneCore(invalid), /Aztec Rune/)
  }
})

test('reuses the Aztec SVG renderer with a Rune-specific accessible label', () => {
  const svg = new AztecSvgRenderer(new AztecRuneCore(42).generate(), { moduleStyle: 'dots' }).render()
  assert.match(svg, /aria-label="Aztec Rune"/)
  assert.match(svg, /<circle /)
})

test('registers Aztec Rune as an independent selectable format', () => {
  assert.equal(formatRegistry.has('aztec-rune'), true)
  const renderer = formatRegistry.createRenderer('aztec-rune', {
    payload: '255', size: 220, options: { ...formatRegistry.defaults(), colorStart: '#111827', colorEnd: '#2563eb' },
  })
  assert.match(renderer.render(), /^<svg\b/)
})
