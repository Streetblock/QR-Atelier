import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateQrMaskPenalty } from '../libs/QRMaskPenalty.js'

const checkerboard = size => Array.from({ length: size }, (_, y) =>
  Array.from({ length: size }, (_, x) => (x + y) % 2 === 0))
const transpose = matrix => matrix.map((_, x) => matrix.map(row => row[x]))
function withLine(line) {
  const matrix = checkerboard(line.length)
  matrix[0] = [...line].map(bit => bit === '1')
  return matrix
}

test('N3 does not invent light modules outside the evaluated symbol', () => {
  for (const line of ['101110110101010', '001011101101010', '010101011011101']) {
    assert.equal(calculateQrMaskPenalty(withLine(line)), 0, line)
    assert.equal(calculateQrMaskPenalty(transpose(withLine(line))), 0, line)
  }
})

test('N3 accepts four actual light modules on either side, including at an edge', () => {
  for (const line of ['101110100001010', '010100001011101', '000010111010000']) {
    assert.equal(calculateQrMaskPenalty(withLine(line)), 40, line)
    assert.equal(calculateQrMaskPenalty(transpose(withLine(line))), 40, line)
  }
})

test('N3 detects scaled ratios with four actual light modules and counts each core once', () => {
  for (const unit of [2, 3, 4]) {
    const line = '0000' + '1'.repeat(unit) + '0'.repeat(unit) + '1'.repeat(3 * unit)
      + '0'.repeat(unit) + '1'.repeat(unit) + '0000'
    const n1 = 3 * unit - 2 // Only the central dark run reaches five modules.
    assert.equal(calculateQrMaskPenalty(withLine(line)), 40 + n1, `unit=${unit}`)
    assert.equal(calculateQrMaskPenalty(transpose(withLine(line))), 40 + n1, `unit=${unit}, column`)
  }
})

test('N3 does not mistake a suffix or prefix of a wider dark run for the required ratio', () => {
  for (const line of ['00001110111010000', '00001011101110000']) {
    assert.equal(calculateQrMaskPenalty(withLine(line)), 0, line)
  }
})

test('N3 counts separate occurrences, not repeated windows of the same occurrence', () => {
  assert.equal(calculateQrMaskPenalty(withLine('00001011101000010111010000')), 80)
})

test('N1 run lengths and overlapping N2 blocks retain their individual penalties', () => {
  for (const [run, expected] of [[5, 3], [6, 4], [7, 5]]) {
    const line = '01010' + '1'.repeat(run) + '01010'
    assert.equal(calculateQrMaskPenalty(withLine(line)), expected)
  }
  const matrix = checkerboard(15)
  for (let y = 5; y < 8; y++) for (let x = 5; x < 8; x++) matrix[y][x] = true
  // Four 2x2 blocks (12), plus one length-five row and column (6).
  assert.equal(calculateQrMaskPenalty(matrix), 18)
})
