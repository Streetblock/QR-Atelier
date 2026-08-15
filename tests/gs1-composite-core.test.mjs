import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  compactGs1Composite,
  getGs1CompositeBitCapacities,
  parseGs1Elements,
} from '../libs/GS1CompositeCompaction.js'
import {
  GS1_CC_A_VARIANTS,
  Gs1CompositeCore,
} from '../libs/GS1CompositeCore.js'

const REFERENCE_FIXTURES = [
  ['(01)09521234543213(3103)000123', 'a', 2, '14f78ac1a04a6317dcaedbf3039f1eece74584447654c53572c8ab0bd1cfc8c0'],
  ['(01)09521234543213(3103)000123', 'b', 2, 'cd87a5481a31592ebaa644c288f69e320a24a07d9a6463294a817a4d85387cc1'],
  ['(01)09521234543213(3103)000123', 'c', 4, '737d5d1ea6e33a4fabbf4503651d23e9024c10520d8365a5941113601aee71cb'],
  ['(21)A12345678', 'a', 2, '4158ad3a653e87747b05908194ab83e684ce718545fffc63b2f5fa47f4e94748'],
  ['(21)A12345678', 'b', 2, '2fa4bb2d4336640a1ade3482c5be92af6be8d968dc1be79fa157f3a477ee440b'],
  ['(21)A12345678', 'c', 4, '61498268b13ab20ef1651f16993c2444dc08271d398873cb1c7a1d537fe41292'],
  ['(99)1234-abcd', 'a', 2, '18b26e18282a316a07c385ba36dc1fc404bbc2ea6c1507133f70d1d1b2fec151'],
  ['(99)1234-abcd', 'b', 2, '44bcc2b11de93544150ebb5ade8bf3202749cfdf73dbf0017dd35443a495dd87'],
  ['(99)1234-abcd', 'c', 4, '26a5e63c398fd0824c64b8b778094233dd89c67091bf2d51d75618bbf1fb8697'],
  ['(235)5vBZIF%!', 'a', 2, 'cf8b26892ce989777c5c0ce0cfc3c5de62b39a41a490003da129719b212db49e'],
  ['(235)5vBZIF%!', 'b', 2, 'f8715958dca527167594d3132772c182e7247e1eb5897d2aa339a26eaf672f89'],
  ['(235)5vBZIF%!', 'c', 4, 'f5ac9597940f7ece34b728e335ddf8510380d4f03afbdf0479b9a038702936f9'],
  ['(01)09521234543213(3103)000123', 'a', 3, '6d7d3c42f77241b125e1e06063129474fd27e95223fdbffa3b3ccafff28af2dd'],
  ['(01)09521234543213(3103)000123', 'a', 4, '6a29ed5b9ce82d8cd96c780ae5408a56caac3325194420252a7a77ce363d4d0e'],
  ['(01)09521234543213(3103)000123', 'b', 3, '18ce8a12cf42d3acc19bdb35cd7dbae39a6fb55aed5242dae15951aff561e1b2'],
  ['(01)09521234543213(3103)000123', 'b', 4, '78214ff7215ea8e728050d2e8ab6170bb592e32a1c4e6e32e3c553c7e53a92b1'],
]

function fingerprint(modules) {
  const bits = modules.map((row) => row.map(Number).join('')).join('')
  return createHash('sha256').update(bits).digest('hex')
}

function assertBooleanMatrix(result) {
  assert.equal(result.modules.length, result.rows)
  assert.ok(result.modules.every((row) => (
    row.length === result.columns && row.every((module) => typeof module === 'boolean')
  )))
}

test('publishes all 17 standardized CC-A layouts', () => {
  assert.equal(GS1_CC_A_VARIANTS.length, 17)
  assert.deepEqual(
    GS1_CC_A_VARIANTS.map((variant) => variant.id),
    [
      'A-2x5', 'A-2x6', 'A-2x7', 'A-2x8', 'A-2x9', 'A-2x10', 'A-2x12',
      'A-3x4', 'A-3x5', 'A-3x6', 'A-3x7', 'A-3x8',
      'A-4x3', 'A-4x4', 'A-4x5', 'A-4x6', 'A-4x7',
    ],
  )
  assert.equal(GS1_CC_A_VARIANTS.find((variant) => variant.id === 'A-3x4').moduleColumns, 72)
})

test('parses bracketed GS1 data and inserts separators after variable fields', () => {
  const elements = parseGs1Elements('(01)09521234543213(10)ABC123(17)300101')
  assert.deepEqual(elements.map(({ ai, value, separator }) => ({ ai, value, separator })), [
    { ai: '01', value: '09521234543213', separator: false },
    { ai: '10', value: 'ABC123', separator: true },
    { ai: '17', value: '300101', separator: false },
  ])

  const raw = parseGs1Elements(`0109521234543213\x1d10ABC123`)
  assert.equal(raw.length, 2)
  assert.equal(raw[0].separator, true)
})

test('selects exact CC-A and CC-B bit capacities', () => {
  assert.deepEqual(getGs1CompositeBitCapacities('a', 2), [59, 78, 88, 108, 118, 138, 167])
  assert.deepEqual(getGs1CompositeBitCapacities('b', 4), [56, 96, 152, 208, 264, 352, 496, 672, 840, 1016, 1184])
  assert.equal(compactGs1Composite('(01)09521234543213', { version: 'a', columns: 2 }).bitCapacity, 59)
})

test('matches independent BWIPP module references for CC-A, CC-B and CC-C', () => {
  for (const [data, version, columns, expected] of REFERENCE_FIXTURES) {
    const result = new Gs1CompositeCore(data, { version, columns }).generate()
    assertBooleanMatrix(result)
    assert.equal(fingerprint(result.modules), expected, `${version}/${columns}: ${data}`)
  }
})

test('shares PDF417 codeword, error-correction and layout machinery', () => {
  const a = new Gs1CompositeCore('(01)09521234543213', { version: 'a' }).generate()
  const b = new Gs1CompositeCore('(01)09521234543213', { version: 'b' }).generate()
  const c = new Gs1CompositeCore('(01)09521234543213', { version: 'c', columns: 4 }).generate()

  assert.equal(a.version, 'CC-A')
  assert.equal(a.dataCodewords.length + a.errorCodewords.length, a.dataColumns * a.rows)
  assert.equal(b.version, 'CC-B')
  assert.equal(b.dataCodewords[0], 920)
  assert.equal(c.version, 'CC-C')
  assert.equal(c.dataCodewords[1], 920)
  assert.equal(c.dataCodewords[0], c.dataCodewords.length)
})

test('supports large CC-C payloads and deterministic repeated generation', () => {
  const data = `(99)${'A'.repeat(500)}`
  const core = new Gs1CompositeCore(data, { version: 'c', columns: 6 })
  const first = core.generate()
  const second = core.generate()
  assert.equal(first.variant, 'C-12x30-ecl4')
  assert.deepEqual(second.codewords, first.codewords)
  assert.deepEqual(second.modules, first.modules)
})

test('validates versions, columns, syntax, characters and capacity', () => {
  assert.throws(() => new Gs1CompositeCore('(01)123', { version: 'x' }).generate(), /version/)
  assert.throws(() => new Gs1CompositeCore('(01)123', { version: 'a', columns: 1 }).generate(), /2 to 4/)
  assert.throws(() => new Gs1CompositeCore('(01)', { version: 'a' }).generate(), /has no value/)
  assert.throws(() => new Gs1CompositeCore('(99)€', { version: 'a' }).generate(), /capacity/)
  assert.throws(
    () => new Gs1CompositeCore(`(99)${'A'.repeat(200)}`, { version: 'b', columns: 4 }).generate(),
    /capacity/,
  )
})
