import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

const GROUP_SEPARATOR = String.fromCharCode(29)

test('GS1 mode prepends FNC1 and maps ASCII 29 to an FNC1 separator', () => {
  const result = new DmCore(`ABC${GROUP_SEPARATOR}DEF`, { gs1: true }).generate()
  assert.equal(result.gs1, true)
  assert.deepEqual(result.dataCodewords.slice(0, 5), [232, 66, 67, 68, 232])
})

test('includes the leading FNC1 in minimal symbol selection', () => {
  const plain = new DmCore('ABC').generate()
  const gs1 = new DmCore('ABC', { gs1: true }).generate()
  assert.equal(`${plain.rows}x${plain.cols}`, '10x10')
  assert.equal(`${gs1.rows}x${gs1.cols}`, '12x12')
  assert.equal(gs1.encodedCodewords, plain.encodedCodewords + 1)
})

test('ASCII 29 remains ordinary data outside GS1 mode', () => {
  const result = new DmCore(`ABC${GROUP_SEPARATOR}DEF`).generate()
  assert.equal(result.gs1, false)
  assert.equal(result.dataCodewords[0], 66)
  assert.equal(result.dataCodewords.includes(232), false)
})

test('places GS1 FNC1 before UTF-8 ECI and counts both prefixes', () => {
  const result = new DmCore(`Grüße🙂${GROUP_SEPARATOR}ABC`, { gs1: true }).generate()
  assert.equal(result.eciAssignmentNumber, 26)
  assert.deepEqual(result.dataCodewords.slice(0, 3), [232, 241, 27])
  assert.ok(result.encodedCodewords >= result.payloadBytes.length + 3)
})

test('encodes FNC1 inside compact C40 and Text runs', () => {
  const upper = new DmCore(`ABCDEFGHIJKLMNOPQRSTUVWXYZ${GROUP_SEPARATOR}ABCDEFGHIJKLMNOPQRSTUVWXYZ`, { gs1: true }).generate()
  const lower = new DmCore(`abcdefghijklmnopqrstuvwxyz${GROUP_SEPARATOR}abcdefghijklmnopqrstuvwxyz`, { gs1: true }).generate()
  assert.ok(upper.encodedCodewords < upper.payloadBytes.length)
  assert.ok(lower.encodedCodewords < lower.payloadBytes.length)
})

test('requires a boolean GS1 option', () => {
  assert.throws(() => new DmCore('ABC', { gs1: 'true' }).generate(), /boolean/)
})
