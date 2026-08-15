import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

test('compacts upper- and lowercase runs into smaller symbols', () => {
  const upper = new DmCore('ABCDEFGHIJKLMNOPQRSTUVWXYZ').generate()
  const lower = new DmCore('abcdefghijklmnopqrstuvwxyz').generate()

  assert.equal(upper.encodedCodewords, 20)
  assert.equal(lower.encodedCodewords, 20)
  assert.equal(`${upper.rows}x${upper.cols}`, '20x20')
  assert.equal(`${lower.rows}x${lower.cols}`, '20x20')
})

test('uses ASCII digit pairs and switches among compact modes', () => {
  const digits = new DmCore('1234567890').generate()
  const x12 = new DmCore('ABC>123*XYZ').generate()
  const edifact = new DmCore('^^^^^^^^^^^^').generate()
  const base256 = new DmCore('é'.repeat(20), { encoding: 'iso-8859-1' }).generate()

  assert.deepEqual(digits.dataCodewords, [142, 164, 186, 208, 220])
  assert.ok(x12.encodedCodewords < 11)
  assert.ok(edifact.encodedCodewords < 12)
  assert.ok(base256.encodedCodewords < 40)
})

test('uses an implicit EDIFACT unlatch when at most two codewords remain', () => {
  const result = new DmCore('@@@@????>>>>', { shape: 'square' }).generate()

  assert.equal(result.encodedCodewords, 10)
  assert.deepEqual(result.dataCodewords, [240, 0, 0, 0, 255, 255, 255, 251, 239, 190, 129, 147])
})

test('prefers C40 over equally compact EDIFACT output', () => {
  const result = new DmCore('ZPL-TOOLKIT', { shape: 'square' }).generate()

  assert.equal(result.encodedCodewords, 10)
  assert.equal(result.dataCodewords[0], 230)
})

test('keeps all generated data and ECC codewords in byte range', () => {
  const payloads = [
    'Mixed lower UPPER 1234567890 >* punctuation!',
    'é'.repeat(80),
    'A'.repeat(400),
    'A'.repeat(2300),
  ]
  for (const payload of payloads) {
    const result = new DmCore(payload).generate()
    assert.ok([...result.dataCodewords, ...result.errorCodewords].every((value) => Number.isInteger(value) && value >= 0 && value <= 255))
  }
})

test('uses UTF-8 with ECI by default and keeps ISO-8859-1 optional', () => {
  const ascii = new DmCore('ASCII only').generate()
  const unicode = new DmCore('Grüße 🙂').generate()
  const latin1 = new DmCore('Grüße', { encoding: 'iso-8859-1' }).generate()

  assert.equal(ascii.encoding, 'utf-8')
  assert.equal(ascii.eciAssignmentNumber, null)
  assert.equal(unicode.encoding, 'utf-8')
  assert.equal(unicode.eciAssignmentNumber, 26)
  assert.deepEqual(unicode.dataCodewords.slice(0, 2), [241, 27])
  assert.deepEqual(unicode.payloadBytes, Array.from(new TextEncoder().encode('Grüße 🙂')))
  assert.equal(latin1.encoding, 'iso-8859-1')
  assert.equal(latin1.eciAssignmentNumber, null)
  assert.deepEqual(latin1.payloadBytes, [71, 114, 252, 223, 101])
  assert.throws(() => new DmCore('Emoji 🙂', { encoding: 'iso-8859-1' }).generate(), /ISO-8859-1/)
  assert.throws(() => new DmCore('ABC', { encoding: 'shift-jis' }).generate(), /Unsupported/)
})

test('includes the ECI overhead in minimal symbol selection', () => {
  const result = new DmCore('é').generate()
  assert.equal(result.encodedCodewords, 6)
  assert.deepEqual(result.dataCodewords.slice(0, 2), [241, 27])
  assert.equal(`${result.rows}x${result.cols}`, '14x14')
})
