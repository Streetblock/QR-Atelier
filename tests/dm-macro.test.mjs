import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

const RECORD_SEPARATOR = String.fromCharCode(30)
const GROUP_SEPARATOR = String.fromCharCode(29)
const END_OF_TRANSMISSION = String.fromCharCode(4)

function frame(macro, payload) {
  return `[)>${RECORD_SEPARATOR}0${macro}${GROUP_SEPARATOR}${payload}${RECORD_SEPARATOR}${END_OF_TRANSMISSION}`
}

test('emits Macro 05 and Macro 06 as the first codeword', () => {
  const macro05 = new DmCore('ABC123', { macro: 5 }).generate()
  const macro06 = new DmCore('ABC123', { macro: 6 }).generate()

  assert.equal(macro05.macro, 5)
  assert.equal(macro06.macro, 6)
  assert.equal(macro05.dataCodewords[0], 236)
  assert.equal(macro06.dataCodewords[0], 237)
})

test('recognizes complete Macro frames and does not encode their header or trailer as data', () => {
  for (const macro of [5, 6]) {
    const explicit = new DmCore('ABC123', { macro }).generate()
    const automatic = new DmCore(frame(macro, 'ABC123'), { macro: 'auto' }).generate()
    const framedExplicit = new DmCore(frame(macro, 'ABC123'), { macro }).generate()

    assert.equal(automatic.macro, macro)
    assert.deepEqual(automatic.payloadBytes, explicit.payloadBytes)
    assert.deepEqual(automatic.dataCodewords, explicit.dataCodewords)
    assert.deepEqual(framedExplicit.dataCodewords, explicit.dataCodewords)
  }
})

test('includes the Macro codeword in minimal symbol selection', () => {
  const plain = new DmCore('ABC').generate()
  const macro = new DmCore('ABC', { macro: 5 }).generate()

  assert.equal(`${plain.rows}x${plain.cols}`, '10x10')
  assert.equal(`${macro.rows}x${macro.cols}`, '12x12')
  assert.equal(macro.encodedCodewords, plain.encodedCodewords + 1)
})

test('places Macro before a required UTF-8 ECI', () => {
  const result = new DmCore('Grüße🙂', { macro: 6 }).generate()
  assert.deepEqual(result.dataCodewords.slice(0, 3), [237, 241, 27])
})

test('validates Macro options and incompatible modes', () => {
  assert.throws(() => new DmCore('ABC', { macro: '05' }).generate(), /macro must/)
  assert.throws(() => new DmCore(frame(5, 'ABC'), { macro: 6 }).generate(), /Macro 05 frame/)
  assert.throws(() => new DmCore(frame(5, ''), { macro: 'auto' }).generate(), /non-empty/)
  assert.throws(() => new DmCore('ABC', { macro: 5, gs1: true }).generate(), /cannot be combined/)
})
