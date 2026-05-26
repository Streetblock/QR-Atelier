import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

test('aztec planning yields message + check words filling usable words', () => {
  const result = new AztecCore('HELLO AZTEC').generate()
  const totalWords = Math.floor(result.usableBits / result.codewordSize)
  assert.equal(result.messageWords.length + result.checkWords.length, totalWords)
  assert.ok(result.checkWords.length > 0)
})

test('aztec supports higher word sizes for larger payloads', () => {
  const text = 'A'.repeat(500)
  const result = new AztecCore(text, { mode: 'full', minLayers: 8, maxLayers: 32 }).generate()
  assert.ok([8, 10, 12].includes(result.codewordSize))
  assert.ok(result.messageWords.length > 0)
  assert.ok(result.checkWords.length > 0)
})
