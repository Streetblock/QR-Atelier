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
  const base256 = new DmCore('é'.repeat(20)).generate()

  assert.deepEqual(digits.dataCodewords, [142, 164, 186, 208, 220])
  assert.ok(x12.encodedCodewords < 11)
  assert.ok(edifact.encodedCodewords < 12)
  assert.ok(base256.encodedCodewords < 40)
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

test('accepts ISO-8859-1 and rejects unrepresentable Unicode', () => {
  assert.doesNotThrow(() => new DmCore('Grüße').generate())
  assert.throws(() => new DmCore('Emoji 🙂').generate(), /ISO-8859-1/)
})
