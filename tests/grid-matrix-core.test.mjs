import assert from 'node:assert/strict'
import test from 'node:test'
import { GridMatrixCore } from '../libs/GridMatrixCore.js'

test('encodes a raw byte block exactly like the Zint reference bitstream', () => {
  const symbol = new GridMatrixCore(Uint8Array.of(0x7F, 0x7F)).generate()
  assert.deepEqual(symbol.dataCodewords, [0x38, 0x02, 0x7F, 0x3F, 0x40])
  assert.equal(symbol.layers, 1)
  assert.equal(symbol.eccLevel, 5)
  assert.equal(symbol.width, 18)
  assert.equal(symbol.readyForScan, true)
})

test('uses native GB2312 when possible and UTF-8 ECI when requested', () => {
  const native = new GridMatrixCore('é').generate()
  assert.equal(native.eci, 0)
  assert.deepEqual(native.dataCodewords, [0x08, 0x54, 0x6F, 0x78, 0x00])

  const explicitGb2312 = new GridMatrixCore('é', { eci: 29 }).generate()
  assert.deepEqual(explicitGb2312.dataCodewords, [0x60, 0x0E, 0x44, 0x2A, 0x37, 0x7C, 0x00])

  const utf8 = new GridMatrixCore('é', { eci: 26 }).generate()
  assert.equal(utf8.eci, 26)
  assert.deepEqual(utf8.dataCodewords, [0x60, 0x0D, 0x1C, 0x01, 0x61, 0x6A, 0x20])
})

test('matches the Grid Matrix Chinese-mode reference vector', () => {
  const symbol = new GridMatrixCore('电电').generate()
  assert.deepEqual(symbol.dataCodewords, [0x09, 0x30, 0x72, 0x61, 0x7F, 0x70, 0x00])
  assert.deepEqual(symbol.modes, ['chinese', 'chinese'])
})

test('matches Zint high-level reference vectors for compact modes', () => {
  const vectors = [
    ['123', [0x10, 0x1E, 0x7F, 0x68], ['numeral', 'numeral', 'numeral']],
    ['AAT', [0x20, 0x00, 0x4F, 0x30], ['upper', 'upper', 'upper']],
    ['aat', [0x18, 0x00, 0x4F, 0x30], ['lower', 'lower', 'lower']],
    ['2.2.0', [0x38, 0x08, 0x32, 0x17, 0x0C, 0x45, 0x63, 0x00, 0x00], Array(5).fill('byte')],
    ['AAT2556 ', [0x29, 0x22, 0x4E, 0x42, 0x0A, 0x14, 0x37, 0x6F, 0x60], Array(8).fill('mixed')],
  ]
  for (const [input, expected, modes] of vectors) {
    const symbol = new GridMatrixCore(input).generate()
    assert.deepEqual(symbol.dataCodewords, expected, input)
    assert.deepEqual(symbol.modes, modes, input)
  }
})

test('matches Zint reference vectors across punctuation and mode boundaries', () => {
  const vectors = [
    ['123,', [0x10, 0x1E, 0x7F, 0x73, 0x76, 0x5E, 0x60]],
    ['123,4', [0x14, 0x1E, 0x7F, 0x51, 0x48, 0x3F, 0x50]],
    ['123\r\n4', [0x14, 0x1E, 0x7F, 0x5D, 0x48, 0x3F, 0x50]],
    ['ABCDE\tF', [0x20, 0x01, 0x08, 0x32, 0x3E, 0x49, 0x17, 0x30]],
    ['\t\t\t\t123456', [0x38, 0x06, 0x09, 0x04, 0x42, 0x21, 0x12, 0x03, 0x6D, 0x64, 0x3F, 0x50]],
    ['1 1234ABCD12.2abcd-12', [0x13, 0x7A, 0x23, 0x41, 0x2A, 0x3F, 0x68, 0x01, 0x08, 0x3E, 0x4F, 0x66, 0x1E, 0x5F, 0x70, 0x00, 0x44, 0x1F, 0x2F, 0x6E, 0x0F, 0x0F, 0x74]],
  ]
  for (const [input, expected] of vectors) {
    assert.deepEqual(new GridMatrixCore(input).generate().dataCodewords, expected, JSON.stringify(input))
  }
})

test('can force byte mode when compact high-level modes are not wanted', () => {
  const automatic = new GridMatrixCore('123').generate()
  const bytes = new GridMatrixCore('123', { mode: 'byte' }).generate()
  assert.ok(automatic.dataCodewords.length < bytes.dataCodewords.length)
  assert.deepEqual(bytes.modes, ['byte', 'byte', 'byte'])
})

test('matches Reader Initialization and Structured Append reference vectors', () => {
  const vectors = [
    [{ readerInitialization: true }, [0x51, 0x11, 0x71, 0x7E, 0x40]],
    [{ structuredAppend: { index: 1, count: 16 } }, [0x48, 0x03, 0x60, 0x24, 0x3C, 0x3F, 0x50]],
    [{ readerInitialization: true, structuredAppend: { index: 1, count: 16 } }, [0x54, 0x40, 0x1E, 0x02, 0x23, 0x63, 0x7D, 0x00]],
    [{ structuredAppend: { index: 2, count: 16 } }, [0x48, 0x03, 0x62, 0x24, 0x3C, 0x3F, 0x50]],
    [{ structuredAppend: { index: 3, count: 3, id: 255 } }, [0x4F, 0x7C, 0x44, 0x24, 0x3C, 0x3F, 0x50]],
  ]
  for (const [options, expected] of vectors) {
    assert.deepEqual(new GridMatrixCore('12', options).generate().dataCodewords, expected, JSON.stringify(options))
  }
})

test('omits Reader Initialization after the first Structured Append symbol', () => {
  const symbol = new GridMatrixCore('12', {
    readerInitialization: true,
    structuredAppend: { index: 2, count: 16 },
  }).generate()
  assert.equal(symbol.readerInitialization, false)
  assert.deepEqual(symbol.dataCodewords, [0x48, 0x03, 0x62, 0x24, 0x3C, 0x3F, 0x50])
})

test('validates Reader Initialization and Structured Append metadata', () => {
  assert.throws(() => new GridMatrixCore('A', { readerInitialization: 1 }).generate(), /boolean/)
  assert.throws(() => new GridMatrixCore('A', { structuredAppend: true }).generate(), /object/)
  assert.throws(() => new GridMatrixCore('A', { structuredAppend: { index: 1, count: 1 } }).generate(), /count/)
  assert.throws(() => new GridMatrixCore('A', { structuredAppend: { index: 3, count: 2 } }).generate(), /index/)
  assert.throws(() => new GridMatrixCore('A', { structuredAppend: { index: 1, count: 2, id: 256 } }).generate(), /id/)
})

test('supports all thirteen explicit versions and produces square boolean matrices', () => {
  for (let layers = 1; layers <= 13; layers++) {
    const symbol = new GridMatrixCore('A', { layers }).generate()
    assert.equal(symbol.layers, layers)
    assert.equal(symbol.width, 6 + layers * 12)
    assert.equal(symbol.modules.length, symbol.height)
    assert.ok(symbol.modules.every(row => row.length === symbol.width && row.every(value => typeof value === 'boolean')))
  }
})

test('validates version, ECC, ECI and capacity options', () => {
  assert.throws(() => new GridMatrixCore('').generate(), /must not be empty/)
  assert.throws(() => new GridMatrixCore('A', { layers: 14 }).generate(), /layers/)
  assert.throws(() => new GridMatrixCore('A', { eccLevel: 6 }).generate(), /ECC/)
  assert.throws(() => new GridMatrixCore('A', { eci: 811800 }).generate(), /ECI/)
  assert.throws(() => new GridMatrixCore(new Uint8Array(200), { layers: 1 }).generate(), /cannot hold/)
})

test('splits byte input into the required 512-byte blocks', () => {
  const symbol = new GridMatrixCore(new Uint8Array(513), { mode: 'byte' }).generate()
  assert.ok(symbol.layers >= 8)
  assert.equal(symbol.encoding, 'byte')
  assert.ok(symbol.modes.every(mode => mode === 'byte'))
})
