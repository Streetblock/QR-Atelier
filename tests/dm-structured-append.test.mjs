import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

test('emits the four Structured Append codewords first', () => {
  const result = new DmCore('PART THREE', {
    structuredAppend: { position: 3, total: 7, fileId: [1, 15] },
  }).generate()

  assert.deepEqual(result.dataCodewords.slice(0, 4), [233, 42, 1, 15])
  assert.deepEqual(result.structuredAppend, {
    position: 3,
    total: 7,
    fileId: 15,
    fileIdCodewords: [1, 15],
  })
})

test('maps the complete numeric file ID range bijectively onto two codewords', () => {
  const first = new DmCore('A', { structuredAppend: { position: 1, total: 16, fileId: 1 } }).generate()
  const middle = new DmCore('A', { structuredAppend: { position: 16, total: 16, fileId: 1015 } }).generate()
  const last = new DmCore('A', { structuredAppend: { position: 1, total: 2, fileId: 64516 } }).generate()

  assert.deepEqual(first.dataCodewords.slice(0, 4), [233, 1, 1, 1])
  assert.deepEqual(middle.dataCodewords.slice(0, 4), [233, 241, 4, 253])
  assert.deepEqual(last.dataCodewords.slice(0, 4), [233, 15, 254, 254])
})

test('includes all four Structured Append codewords in minimal symbol selection', () => {
  const plain = new DmCore('A').generate()
  const appended = new DmCore('A', { structuredAppend: { position: 1, total: 2, fileId: 1 } }).generate()

  assert.equal(`${plain.rows}x${plain.cols}`, '10x10')
  assert.equal(`${appended.rows}x${appended.cols}`, '12x12')
  assert.equal(appended.encodedCodewords, plain.encodedCodewords + 4)
})

test('combines Structured Append with GS1 in the standard prefix order', () => {
  const first = new DmCore('0109501101530003', {
    gs1: true,
    structuredAppend: { position: 1, total: 2, fileId: 15 },
  }).generate()
  const second = new DmCore(`10ABC${String.fromCharCode(29)}17271231`, {
    gs1: true,
    structuredAppend: { position: 2, total: 2, fileId: 15 },
  }).generate()

  assert.deepEqual(first.dataCodewords.slice(0, 5), [233, 15, 1, 15, 232])
  assert.deepEqual(second.dataCodewords.slice(0, 4), [233, 31, 1, 15])
  assert.equal(second.dataCodewords.includes(232), true)
})

test('places UTF-8 ECI after the Structured Append header', () => {
  const result = new DmCore('Grüße🙂', {
    structuredAppend: { position: 1, total: 2, fileId: 15 },
  }).generate()
  assert.deepEqual(result.dataCodewords.slice(0, 6), [233, 15, 1, 15, 241, 27])
})

test('validates Structured Append ranges and incompatible modes', () => {
  assert.throws(() => new DmCore('A', { structuredAppend: true }).generate(), /must be null or an object/)
  assert.throws(() => new DmCore('A', { structuredAppend: { position: 1, total: 1, fileId: 1 } }).generate(), /total/)
  assert.throws(() => new DmCore('A', { structuredAppend: { position: 3, total: 2, fileId: 1 } }).generate(), /position/)
  assert.throws(() => new DmCore('A', { structuredAppend: { position: 1, total: 2, fileId: 0 } }).generate(), /fileId/)
  assert.throws(() => new DmCore('A', { structuredAppend: { position: 1, total: 2, fileId: [1, 255] } }).generate(), /codeword pair/)
  assert.throws(() => new DmCore('A', { structuredAppend: { position: 1, total: 2, fileId: 1 }, macro: 5 }).generate(), /cannot be combined/)
  assert.throws(() => new DmCore('A', { structuredAppend: { position: 1, total: 2, fileId: 1 }, readerProgramming: true }).generate(), /cannot be combined/)
})
