import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore, DMRE_SYMBOL_SIZES } from '../libs/DMcore.js'

test('encodes multiple ECI segments in one Data Matrix symbol', () => {
  const latin1 = Uint8Array.of(71, 114, 252, 223, 101)
  const utf8 = new TextEncoder().encode(' / 東京')
  const result = new DmCore(null, {
    segments: [
      { data: latin1, eci: 3 },
      { data: utf8, eci: 26 },
    ],
  }).generate()

  assert.deepEqual(result.payloadBytes, [...latin1, ...utf8])
  assert.equal(result.eciAssignmentNumber, null)
  assert.deepEqual(result.eciSegments.map((segment) => segment.eciAssignmentNumber), [3, 26])
  assert.deepEqual(result.eciSegments.map((segment) => segment.byteOffset), [0, latin1.length])
  assert.equal(result.dataCodewords.filter((codeword) => codeword === 241).length, 2)
})

test('validates the semantic Data Matrix segment API', () => {
  assert.throws(() => new DmCore(null, { segments: [] }).generate(), /non-empty array/)
  assert.throws(() => new DmCore('ignored', { segments: [{ data: 'ABC' }] }), /must be null/)
  assert.throws(() => new DmCore(null, { segments: [{}] }).generate(), /data property/)
  assert.throws(() => new DmCore(null, { segments: [{ data: [] }] }).generate(), /must not be empty/)
  assert.throws(() => new DmCore(null, { segments: [{ data: 'ABC' }], macro: 'auto' }).generate(), /not available/)

  const withoutEci = new DmCore(null, { segments: [{ data: 'Ü', eci: null }] }).generate()
  assert.equal(withoutEci.eciSegments[0].eciAssignmentNumber, null)
  assert.notEqual(withoutEci.dataCodewords[0], 241)
})

test('exposes all 18 standardized DMRE symbol sizes', () => {
  assert.deepEqual(DMRE_SYMBOL_SIZES.map(({ rows, cols }) => `${rows}x${cols}`), [
    '8x48', '8x64', '8x80', '8x96', '8x120', '8x144',
    '12x64', '12x88', '16x64', '20x36', '20x44', '20x64',
    '22x48', '24x48', '24x64', '26x40', '26x48', '26x64',
  ])
  assert.ok(DMRE_SYMBOL_SIZES.every((symbol) => symbol.dmre && symbol.rectangular))
})

test('generates every DMRE size with its exact data and ECC capacity', () => {
  for (const expected of DMRE_SYMBOL_SIZES) {
    const result = new DmCore('DMRE', { symbolSize: `${expected.rows}x${expected.cols}` }).generate()
    assert.equal(result.rows, expected.rows)
    assert.equal(result.cols, expected.cols)
    assert.equal(result.symbol.dmre, true)
    assert.equal(result.dataCodewords.length, expected.dataCodewords)
    assert.equal(result.errorCodewords.length, expected.errorCodewords)
    assert.equal(result.modules.length, expected.rows)
    assert.ok(result.modules.every((row) => row.length === expected.cols))
  }
})

test('keeps DMRE out of automatic selection unless explicitly enabled', () => {
  const payload = Uint8Array.from({ length: 21 }, (_, index) => 128 + index)
  const classic = new DmCore(payload).generate()
  const enabled = new DmCore(payload, { dmre: true }).generate()
  const onlyDmre = new DmCore('A', { shape: 'dmre' }).generate()

  assert.equal(Boolean(classic.symbol.dmre), false)
  assert.equal(enabled.symbol.dmre, true)
  assert.equal(onlyDmre.symbol.dmre, true)
  assert.throws(() => new DmCore('A', { dmre: 'yes' }).generate(), /dmre must be a boolean/)
})
