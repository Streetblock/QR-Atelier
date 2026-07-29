import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

test('auto mode picks compact for short payload', () => {
  const result = new AztecCore('HELLO').generate()
  assert.equal(result.compact, true)
  assert.ok(result.layers >= 1 && result.layers <= 4)
  assert.ok(result.usableBits >= result.payloadBits + result.eccBits)
})

test('full mode forces full symbols', () => {
  const result = new AztecCore('HELLO', { mode: 'full', minLayers: 1, maxLayers: 4 }).generate()
  assert.equal(result.compact, false)
  assert.equal(result.size, 15 + 4 * result.layers)
})

test('compact mode rejects layers > 4 range', () => {
  assert.throws(() => {
    new AztecCore('HELLO', { mode: 'compact', minLayers: 5, maxLayers: 8 }).generate()
  })
})

test('tight layer range overflows when too much data', () => {
  const longText = 'A'.repeat(2000)
  assert.throws(() => {
    new AztecCore(longText, { mode: 'compact', minLayers: 1, maxLayers: 4 }).generate()
  })
})
