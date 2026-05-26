import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

function count(matrix, predicate) {
  let n = 0
  for (const row of matrix) {
    for (const cell of row) {
      if (predicate(cell)) n += 1
    }
  }
  return n
}

test('data/ecc placement fills non-function area', () => {
  const result = new AztecCore('HELLO AZTEC RING PLACEMENT', { mode: 'auto' }).generate()
  let nonFunctionCount = 0
  let darkNonFunction = 0
  for (let y = 0; y < result.size; y += 1) {
    for (let x = 0; x < result.size; x += 1) {
      if (!result.isFunction[y][x]) {
        nonFunctionCount += 1
        if (result.modules[y][x]) darkNonFunction += 1
      }
    }
  }
  assert.ok(nonFunctionCount > 0)
  assert.ok(darkNonFunction > 0)
})

test('mode message bits are present', () => {
  const result = new AztecCore('HELLO', { mode: 'compact', minLayers: 2, maxLayers: 2 }).generate()
  assert.ok(result.modeMessageBits.length > 0)
  assert.ok(count(result.isFunction, Boolean) > 0)
})
