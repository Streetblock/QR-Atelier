import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore, DM_ECC200_SYMBOL_SIZES } from '../libs/DMcore.js'

const SIZES = [
  '10x10', '12x12', '8x18', '14x14', '8x32', '16x16', '12x26', '18x18',
  '20x20', '12x36', '22x22', '16x36', '24x24', '26x26', '16x48', '32x32',
  '36x36', '40x40', '44x44', '48x48', '52x52', '64x64', '72x72', '80x80',
  '88x88', '96x96', '104x104', '120x120', '132x132', '144x144',
]

test('exposes all 30 classic ECC 200 symbol sizes', () => {
  assert.deepEqual(DM_ECC200_SYMBOL_SIZES.map(({ rows, cols }) => `${rows}x${cols}`), SIZES)
  assert.equal(DM_ECC200_SYMBOL_SIZES.filter(({ rectangular }) => rectangular).length, 6)
  assert.equal(DM_ECC200_SYMBOL_SIZES.filter(({ rectangular }) => !rectangular).length, 24)
})

test('generates every supported symbol with its complete codeword capacity', () => {
  for (const symbolSize of SIZES) {
    const result = new DmCore('A', { symbolSize }).generate()
    assert.equal(`${result.rows}x${result.cols}`, symbolSize)
    assert.equal(result.modules.length, result.rows)
    assert.ok(result.modules.every((row) => row.length === result.cols))
    assert.equal(result.dataCodewords.length, result.symbol.dataCodewords)
    assert.equal(result.errorCodewords.length, result.symbol.errorCodewords)
    assert.ok([...result.dataCodewords, ...result.errorCodewords].every((value) => Number.isInteger(value) && value >= 0 && value <= 255))
  }
})

test('supports automatic, square-only, rectangle-only, and forced-size selection', () => {
  const automatic = new DmCore('ABC').generate()
  const square = new DmCore('ABC', { shape: 'square' }).generate()
  const rectangle = new DmCore('ABC', { shape: 'rectangle' }).generate()
  const forced = new DmCore('1234567890', { symbolSize: '8x32' }).generate()

  assert.equal(`${automatic.rows}x${automatic.cols}`, '10x10')
  assert.equal(square.rows, square.cols)
  assert.equal(`${rectangle.rows}x${rectangle.cols}`, '8x18')
  assert.equal(`${forced.rows}x${forced.cols}`, '8x32')
})

test('honors rectangular dimension constraints and rejects impossible inputs', () => {
  const result = new DmCore('ABCDEFGHIJKLMNO', {
    shape: 'rectangle',
    minSize: { rows: 12, cols: 26 },
    maxSize: '16x48',
  }).generate()
  assert.ok(result.rows >= 12 && result.cols >= 26)
  assert.throws(() => new DmCore('A'.repeat(100), { shape: 'rectangle' }).generate())
  assert.throws(() => new DmCore('ABC', { symbolSize: '9x9' }).generate())
})

test('uses the special ten-block layout of the 144x144 symbol', () => {
  const result = new DmCore('A'.repeat(2300)).generate()
  assert.equal(result.rows, 144)
  assert.equal(result.dataCodewords.length, 1558)
  assert.equal(result.errorCodewords.length, 620)
  assert.deepEqual(result.symbol.rsBlockDataLengths, [156, 156, 156, 156, 156, 156, 156, 156, 155, 155])
})
