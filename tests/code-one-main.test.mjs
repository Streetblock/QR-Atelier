import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { CodeOneCore } from '../libs/CodeOneCore.js'

const references = [
  ['A', 18, 16, '50aa7fb5610bfc5770b61668703d9f3d23165ba79872e6469620fefd6f0acada'],
  ['B', 22, 22, '3b408202885dda0921db57d7f62cc1be268fd5fb3f48d5fec93d4bc3601cff32'],
  ['C', 32, 28, '0086896b957196c45dfe213a23d48eca042be31d983b9e241ec9c83dc5a5f170'],
  ['D', 42, 40, '3d285cf2627cb1230173e7b1a9412b18571f398b673099a9433cec95dfec18cf'],
  ['E', 54, 52, '5b8bf89c672e9be71ba0b05a5d64c87fd87e8284b40375ac3149fed7a4ac8ba0'],
  ['F', 76, 70, '68deaede938e419f7116be1f8cc4eda5cb57ee830c6a0b33c157520b5184d795'],
  ['G', 98, 104, '1f93e727f8c4b8473cd8815e6b358664a1ed3a4a58240a5a829d6706377a2429'],
  ['H', 134, 148, '4e2cdf4d1451b4192c832dbc6f0829710981e4a53585b5207e1fbd937040a734'],
]

test('matches official Zint/AIM matrices for every Code One version A through H', () => {
  for (const [version, width, height, expectedHash] of references) {
    const symbol = new CodeOneCore('1', { version }).generate()
    const bits = symbol.modules.map(row => row.map(Number).join('')).join('')
    assert.equal(symbol.width, width, `Version ${version} width`)
    assert.equal(symbol.height, height, `Version ${version} height`)
    assert.equal(createHash('sha256').update(bits).digest('hex'), expectedHash, `Version ${version} matrix`)
  }
})

test('selects the smallest general Code One version and validates forced capacity', () => {
  assert.equal(new CodeOneCore('A'.repeat(10), { version: 'A-H' }).generate().version, 'A')
  assert.equal(new CodeOneCore('?'.repeat(11), { version: 'A-H' }).generate().version, 'B')
  assert.equal(new CodeOneCore('?'.repeat(1480), { version: 'A-H' }).generate().version, 'H')
  assert.throws(() => new CodeOneCore('?'.repeat(11), { version: 'A' }).generate(), /input requires 11/)
  assert.throws(() => new CodeOneCore('?'.repeat(1481), { version: 'A-H' }).generate(), /at most 1480/)
})

test('matches official matrices for every general high-level mode', () => {
  const modes = [
    ['decimal', '1234567890123', '69225474e52513e1a74bfea8edb526263e2806786434eb055dc6d44e2bdccfd4'],
    ['c40', 'GOSGOS', '8e05a2143a656a34472c334144aa099a86e503da487677250b6782b45957e682'],
    ['text', 'gosgos', 'dc1de9f6e1fdfef63f4ea40b1e048bacb2bda6eeadd41a5de13975d7cb771d94'],
    ['edi', '\r*>\r*>', 'a70b416ff24a17acbc729de82ce90f48fdd220919bdad84733bcfa95a0729c2f'],
    ['byte', '\x80\x80', '3f9718bc89bf97cfcc57b21d413b07b899994afa808b158717e17b38e8fbbce1'],
  ]
  for (const [mode, data, expectedHash] of modes) {
    const symbol = new CodeOneCore(data, { version: 'A', mode }).generate()
    const bits = symbol.modules.map(row => row.map(Number).join('')).join('')
    assert.equal(symbol.encodingMode, mode)
    assert.equal(createHash('sha256').update(bits).digest('hex'), expectedHash, `${mode} matrix`)
  }
})

test('validates explicitly selected high-level modes', () => {
  assert.throws(() => new CodeOneCore('lowercase', { version: 'A-H', mode: 'c40' }).generate(), /cannot encode/)
  assert.throws(() => new CodeOneCore('ABC', { version: 'A-H', mode: 'decimal' }).generate(), /requires decimal digits/)
  assert.throws(() => new CodeOneCore('ABC', { version: 'A-H', mode: 'unknown' }).generate(), /must be auto/)
})

test('matches official Structured Append and ECI matrices', () => {
  const controls = [
    ['ABCDEFGHIJ', { version: 'A', structuredAppend: { index: 1, count: 15 } }, '85fbe4389b3c3aa461ddfa82ddbd1f0d1f561328168a6a8812eea94e021c4690'],
    ['KLMNOPQRST', { version: 'A', structuredAppend: { index: 2, count: 15 } }, 'cbae2063f381ca65a256efec038fbb4de41100b4776b6c6b0a556548b424c515'],
    ['AB', { version: 'A', eci: 3, structuredAppend: { index: 1, count: 15 } }, 'ed8a13bed3a36af7fdb87643a0db261226dc18b542a507201948dc64c23191b7'],
    ['ABCDEFGHI', { version: 'A', structuredAppend: { index: 128, count: 128 } }, '8886ea7e7497f4a84f9760ace9ca854763b0b367199783e6daf316b623324e49'],
  ]
  for (const [data, options, expectedHash] of controls) {
    const symbol = new CodeOneCore(data, options).generate()
    const bits = symbol.modules.map(row => row.map(Number).join('')).join('')
    assert.equal(createHash('sha256').update(bits).digest('hex'), expectedHash)
  }
})

test('encodes GS1 separators, ECI Unicode bytes and validates control options', () => {
  const gs1 = new CodeOneCore(`0104912345123459\x1d10ABC`, { version: 'A-H', gs1: true }).generate()
  assert.equal(gs1.gs1, true)
  assert.equal(gs1.dataCodewords[0], 232)
  assert.ok(gs1.dataCodewords.includes(232, 1), 'GS separator must become FNC1')

  const unicode = new CodeOneCore('Grüße', { version: 'A-H', encoding: 'utf-8', eci: 26 }).generate()
  assert.equal(unicode.eci, 26)
  assert.deepEqual(unicode.dataCodewords.slice(0, 3), [129, 93, 93])

  assert.throws(() => new CodeOneCore('A', { version: 'A-H', gs1: true, eci: 3 }).generate(), /cannot carry ECI/)
  assert.throws(() => new CodeOneCore('A', { version: 'A-H', gs1: true, structuredAppend: { index: 1, count: 2 } }).generate(), /cannot combine/)
  assert.throws(() => new CodeOneCore('A', { version: 'A-H', structuredAppend: { index: 1, count: 1 } }).generate(), /count must be/)
  assert.throws(() => new CodeOneCore('A', { version: 'A-H', structuredAppend: { index: 3, count: 2 } }).generate(), /index must be/)
  assert.throws(() => new CodeOneCore('Grüße', { version: 'A-H', encoding: 'utf-8' }).generate(), /requires an ECI/)
  assert.throws(() => new CodeOneCore('1', { version: 'S', eci: 3 }).generate(), /not yet available/)
})
