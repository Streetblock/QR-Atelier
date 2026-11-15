import assert from 'node:assert/strict'
import test from 'node:test'
import { DmCore } from '../libs/DMcore.js'

test('external codeword markers require a zero sentinel rather than overwriting a payload byte', () => {
  assert.throws(() => new DmCore(Uint8Array.of(49, 50), {
    modes: ['ascii'], specialCodewords: new Map([[1, [232]]]),
  }).generate(), /zero.*placeholder/i)
  assert.throws(() => new DmCore(Uint8Array.of(49, 50), {
    specialCodewords: { 1: [232] },
  }).generate(), /zero.*placeholder/i)
  assert.deepEqual(new DmCore(Uint8Array.of(49, 0), {
    modes: ['ascii'], specialCodewords: new Map([[1, [232]]]),
  }).generate().dataCodewords, [50, 232, 129])
})

test('external marker maps and codeword arrays are validated before encoding', () => {
  for (const markers of [
    new Map([[-1, [232]]]), new Map([[1, [232]]]), new Map([[0.5, [232]]]),
    new Map([[0, []]]), new Map([[0, [0]]]), new Map([[0, [255]]]),
    new Map([[0, [NaN]]]), new Map([[0, [1.5]]]), new Map([[0, '232']]),
    new Map([[0, [232]], ['0', [129]]]),
  ]) {
    assert.throws(() => new DmCore(Uint8Array.of(0), { specialCodewords: markers }).generate())
  }
  for (const markers of [4, [], '0:232']) {
    assert.throws(() => new DmCore(Uint8Array.of(0), { specialCodewords: markers }).generate(), /map or record/i)
  }
})

test('typed marker words are accepted without mutating the caller input or map', () => {
  const bytes = Uint8Array.of(65, 0)
  const words = Uint8Array.of(232)
  const markers = new Map([[1, words]])
  assert.deepEqual(new DmCore(bytes, { modes: ['ascii'], specialCodewords: markers }).generate().dataCodewords, [66, 232, 129])
  assert.deepEqual(bytes, Uint8Array.of(65, 0))
  assert.deepEqual(words, Uint8Array.of(232))
  assert.equal(markers.get(1), words)
})

test('external markers cannot be ambiguously combined with source segments', () => {
  assert.throws(() => new DmCore(null, {
    segments: [{ data: 'A' }], specialCodewords: new Map(),
  }).generate(), /cannot be combined with segments/i)
})

test('terminal explicit PAD starts padding exactly once, but an ECI token ending in129 does not', () => {
  const pad = new DmCore(Uint8Array.of(65, 0), {
    modes: ['ascii'], specialCodewords: new Map([[1, [129]]]),
  }).generate()
  assert.deepEqual(pad.dataCodewords, [66, 129, 70])
  assert.equal(pad.encodedCodewords, 2)
  const eci = new DmCore(Uint8Array.of(65, 0), {
    modes: ['ascii'], specialCodewords: new Map([[1, [241, 128, 129]]]),
  }).generate()
  assert.deepEqual(eci.dataCodewords, [66, 241, 128, 129, 129])
  assert.equal(eci.encodedCodewords, 4)
})

test('multiword marker tails remain intact at compaction and capacity boundaries', () => {
  for (const mode of ['c40', 'text', 'x12', 'edifact', 'base256']) {
    const prefix = mode === 'text' ? 'abcdefgh' : 'ABCDEFGH'
    for (const words of [[241, 27], [233, 1, 1, 1]]) {
      const result = new DmCore(Uint8Array.from([...new TextEncoder().encode(prefix), 0]), {
        modes: [mode], specialCodewords: new Map([[8, words]]),
      }).generate()
      assert.deepEqual(result.dataCodewords.slice(result.encodedCodewords - words.length, result.encodedCodewords), words)
      assert.equal(result.dataCodewords.length, result.symbol.dataCodewords)
    }
  }
})
