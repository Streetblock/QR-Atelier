import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

function extractCompactModeBits(matrix) {
  const center = Math.floor(matrix.length / 2)
  const bits = new Array(28).fill(0)
  for (let i = 0; i < 7; i += 1) {
    const offset = center - 3 + i
    bits[i] = matrix[center - 5][offset] ? 1 : 0
    bits[i + 7] = matrix[offset][center + 5] ? 1 : 0
    bits[20 - i] = matrix[center + 5][offset] ? 1 : 0
    bits[27 - i] = matrix[offset][center - 5] ? 1 : 0
  }
  return bits
}

function extractFullModeBits(matrix) {
  const center = Math.floor(matrix.length / 2)
  const bits = new Array(40).fill(0)
  for (let i = 0; i < 10; i += 1) {
    const offset = center - 5 + i + Math.floor(i / 5)
    bits[i] = matrix[center - 7][offset] ? 1 : 0
    bits[i + 10] = matrix[offset][center + 7] ? 1 : 0
    bits[29 - i] = matrix[center + 7][offset] ? 1 : 0
    bits[39 - i] = matrix[offset][center - 7] ? 1 : 0
  }
  return bits
}

test('compact mode message is placed bit-exactly', () => {
  const result = new AztecCore('HELLO', { mode: 'compact', minLayers: 2, maxLayers: 2 }).generate()
  assert.equal(result.compact, true)
  assert.equal(result.modeMessageBits.length, 28)
  assert.deepEqual(extractCompactModeBits(result.modules), result.modeMessageBits)
})

test('full mode message is placed bit-exactly', () => {
  const result = new AztecCore('HELLO AZTEC FULL', { mode: 'full', minLayers: 5, maxLayers: 5 }).generate()
  assert.equal(result.compact, false)
  assert.equal(result.modeMessageBits.length, 40)
  assert.deepEqual(extractFullModeBits(result.modules), result.modeMessageBits)
})

