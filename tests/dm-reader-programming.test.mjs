import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

test('emits Reader Programming as the first codeword', () => {
  const result = new DmCore('READER-CONFIG', { readerProgramming: true }).generate()

  assert.equal(result.readerProgramming, true)
  assert.equal(result.dataCodewords[0], 234)
})

test('includes Reader Programming in minimal symbol selection', () => {
  const plain = new DmCore('ABC').generate()
  const programming = new DmCore('ABC', { readerProgramming: true }).generate()

  assert.equal(`${plain.rows}x${plain.cols}`, '10x10')
  assert.equal(`${programming.rows}x${programming.cols}`, '12x12')
  assert.equal(programming.encodedCodewords, plain.encodedCodewords + 1)
})

test('places Reader Programming before a required UTF-8 ECI', () => {
  const result = new DmCore('Grüße🙂', { readerProgramming: true }).generate()
  assert.deepEqual(result.dataCodewords.slice(0, 3), [234, 241, 27])
})

test('leaves Reader Programming disabled by default', () => {
  const result = new DmCore('ABC').generate()
  assert.equal(result.readerProgramming, false)
  assert.notEqual(result.dataCodewords[0], 234)
})

test('validates Reader Programming and incompatible modes', () => {
  assert.throws(() => new DmCore('ABC', { readerProgramming: 1 }).generate(), /boolean/)
  assert.throws(() => new DmCore('ABC', { readerProgramming: true, gs1: true }).generate(), /cannot be combined/)
  assert.throws(() => new DmCore('ABC', { readerProgramming: true, macro: 5 }).generate(), /cannot be combined/)
})
