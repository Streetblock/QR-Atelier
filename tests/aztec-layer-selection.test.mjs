import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

test('auto mode picks compact for short payload', () => {
  const result = new AztecCore('HELLO').generate()
  assert.equal(result.compact, true)
  assert.equal(result.layers, 1)
  assert.equal(result.size, 15)
  assert.ok(result.usableBits >= result.stuffedBits.length + result.minimumEccBits)
})

test('high-level encoding uses the compact Aztec text tables', () => {
  assert.equal(new AztecCore('HELLO').generate().payloadBits, 25)
  assert.equal(new AztecCore('HELLO AZTEC').generate().payloadBits, 55)

  const repeated = new AztecCore('A'.repeat(100)).generate()
  assert.equal(repeated.payloadBits, 500)
  assert.equal(repeated.compact, false)
  assert.equal(repeated.layers, 4)
  assert.equal(repeated.size, 31)
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

test('variable ECC changes planning and reports the actual check words', () => {
  const payload = 'AZTEC VARIABLE ECC '.repeat(8)
  const low = new AztecCore(payload, { errorCorrectionPercent: 5 }).generate()
  const high = new AztecCore(payload, { errorCorrectionPercent: 95 }).generate()

  assert.equal(low.errorCorrectionPercent, 5)
  assert.equal(high.errorCorrectionPercent, 95)
  assert.ok(high.size > low.size)

  for (const result of [low, high]) {
    assert.equal(result.eccBits, result.checkWords.length * result.codewordSize)
    assert.ok(result.eccBits >= result.minimumEccBits)
    assert.ok(result.actualErrorCorrectionPercent >= result.errorCorrectionPercent)
    assert.ok(result.stuffedBits.length + result.minimumEccBits <= result.usableBits)
    if (result.compact) assert.ok(result.messageWords.length <= 64)
  }
})

test('ECC defaults to the Aztec recommendation and validates its range', () => {
  assert.equal(new AztecCore('HELLO').generate().errorCorrectionPercent, 33)
  assert.throws(() => new AztecCore('HELLO', { errorCorrectionPercent: 4 }).generate())
  assert.throws(() => new AztecCore('HELLO', { errorCorrectionPercent: 96 }).generate())
})
