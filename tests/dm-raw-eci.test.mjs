import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

test('encodes arbitrary raw bytes without guessing an ECI assignment', () => {
  const result = new DmCore(Uint8Array.of(0, 29, 128, 255)).generate()

  assert.deepEqual(result.payloadBytes, [0, 29, 128, 255])
  assert.equal(result.encoding, null)
  assert.equal(result.eciAssignmentNumber, null)
  assert.notEqual(result.dataCodewords[0], 241)
})

test('encodes every Data Matrix ECI assignment length at its boundaries', () => {
  const cases = [
    [0, [241, 1]],
    [26, [241, 27]],
    [126, [241, 127]],
    [127, [241, 128, 1]],
    [16382, [241, 191, 254]],
    [16383, [241, 192, 1, 1]],
    [999999, [241, 207, 63, 129]],
  ]

  for (const [eci, expected] of cases) {
    const result = new DmCore(Uint8Array.of(65), { eci }).generate()
    assert.equal(result.eciAssignmentNumber, eci)
    assert.deepEqual(result.dataCodewords.slice(0, expected.length), expected)
  }
})

test('keeps automatic UTF-8 ECI behavior and permits an explicit override', () => {
  const ascii = new DmCore('ABC').generate()
  const utf8 = new DmCore('Ü').generate()
  const explicit = new DmCore('ABC', { eci: 3 }).generate()
  const suppressed = new DmCore('Ü', { eci: null }).generate()

  assert.equal(ascii.eciAssignmentNumber, null)
  assert.deepEqual(utf8.dataCodewords.slice(0, 2), [241, 27])
  assert.deepEqual(explicit.dataCodewords.slice(0, 2), [241, 4])
  assert.equal(suppressed.eciAssignmentNumber, null)
  assert.notEqual(suppressed.dataCodewords[0], 241)
})

test('validates raw bytes and ECI assignments', () => {
  assert.throws(() => new DmCore([]), /must not be empty/)
  assert.throws(() => new DmCore([256]), /0 to 255/)
  assert.throws(() => new DmCore([1.5]), /0 to 255/)
  assert.throws(() => new DmCore(new DataView(new ArrayBuffer(1))), /string or byte array/)
  assert.throws(() => new DmCore({ length: 1 }), /string or byte array/)
  assert.throws(() => new DmCore('ABC', { eci: -1 }).generate(), /0 to 999999/)
  assert.throws(() => new DmCore('ABC', { eci: 1000000 }).generate(), /0 to 999999/)
})

test('supports standard control prefixes with raw payloads', () => {
  const macro = new DmCore(Uint8Array.of(65, 66, 67), { macro: 5 }).generate()
  const readerProgramming = new DmCore(Uint8Array.of(65), { readerProgramming: true }).generate()

  assert.equal(macro.dataCodewords[0], 236)
  assert.equal(readerProgramming.dataCodewords[0], 234)
})
