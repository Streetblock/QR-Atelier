import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

function countTrue(matrix) {
  let n = 0
  for (const row of matrix) {
    for (const cell of row) if (cell) n += 1
  }
  return n
}

test('compact scaffold has expected size and function pattern', () => {
  const result = new AztecCore('HELLO', { mode: 'compact', minLayers: 1, maxLayers: 4 }).generate()
  assert.equal(result.compact, true)
  assert.equal(result.size, 11 + 4 * result.layers)
  assert.equal(result.modules.length, result.size)
  assert.equal(result.isFunction.length, result.size)
  assert.ok(countTrue(result.isFunction) > 0)
})

test('full scaffold includes reference grid and has more function modules', () => {
  const compact = new AztecCore('HELLO', { mode: 'compact', minLayers: 2, maxLayers: 2 }).generate()
  const full = new AztecCore('HELLO', { mode: 'full', minLayers: 2, maxLayers: 2 }).generate()
  assert.equal(full.compact, false)
  assert.equal(full.size, 15 + 4 * full.layers)
  assert.ok(countTrue(full.isFunction) > countTrue(compact.isFunction))
})
