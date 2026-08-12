import assert from 'node:assert/strict'
import test from 'node:test'
import { BitMatrix } from '@zxing/library'
import decoderModule from '@zxing/library/cjs/core/maxicode/decoder/Decoder.js'
import parserModule from '@zxing/library/cjs/core/maxicode/decoder/BitMatrixParser.js'
import { MaxiCodeCore } from '../libs/MaxiCodeCore.js'

const MaxiCodeDecoder = decoderModule.default
const MaxiCodeBitMatrixParser = parserModule.default

function toBitMatrix(modules) {
  const matrix = new BitMatrix(modules[0].length, modules.length)
  for (let y = 0; y < modules.length; y += 1) {
    for (let x = 0; x < modules[y].length; x += 1) {
      if (modules[y][x]) matrix.set(x, y)
    }
  }
  return matrix
}

test('ZXing decodes MaxiCode modes 2 through 5', () => {
  const cases = [
    {
      data: 'CARRIER MODE TWO',
      options: { mode: 2, postalCode: '336091062', countryCode: '840', serviceClass: '002' },
      expected: '336091062\x1d840\x1d002\x1dCARRIER MODE TWO',
    },
    {
      data: 'US ZIP FIVE',
      options: { mode: 2, postalCode: '12345', countryCode: '840', serviceClass: '001' },
      expected: '123450000\x1d840\x1d001\x1dUS ZIP FIVE',
    },
    {
      data: 'CARRIER MODE THREE',
      options: { mode: 3, postalCode: 'K1A0B1', countryCode: '124', serviceClass: '001' },
      expected: 'K1A0B1\x1d124\x1d001\x1dCARRIER MODE THREE',
    },
    { data: 'GENERAL MODE FOUR 123', options: { mode: 4 } },
    { data: 'ENHANCED MODE FIVE 123', options: { mode: 5 } },
  ]

  for (const { data, options, expected = data } of cases) {
    const generated = new MaxiCodeCore(data, options).generate()
    const decoded = new MaxiCodeDecoder().decode(toBitMatrix(generated.modules))
    assert.equal(decoded.getText(), expected, `mode ${options.mode}`)
    assert.equal(decoded.getECLevel(), String(options.mode), `mode ${options.mode}`)
  }
})

test('ZXing decodes optimally compacted numeric and mixed-set payloads', () => {
  const cases = [
    { data: '1'.repeat(138), options: { mode: 4 } },
    { data: '1'.repeat(113), options: { mode: 5 } },
    { data: 'aBCd123456789efGHI987654321j', options: { mode: 4 } },
    { data: 'ÀÁÂÃÄÅÆÇÈÉàáâãäåæçèé', options: { mode: 4 } },
    { data: '\x00\x01\x02\x03\x04\x05', options: { mode: 4, preserveControls: true } },
  ]

  for (const { data, options } of cases) {
    const generated = new MaxiCodeCore(data, options).generate()
    const decoded = new MaxiCodeDecoder().decode(toBitMatrix(generated.modules))
    assert.equal(decoded.getText(), data, `mode ${options.mode}`)
  }
})

test('ZXing structurally decodes a MaxiCode carrying ECI 26', () => {
  const generated = new MaxiCodeCore('ABC', { mode: 4, eci: 26 }).generate()
  const decoded = new MaxiCodeDecoder().decode(toBitMatrix(generated.modules))

  // ZXing's MaxiCode parser exposes ECI as its internal marker plus the
  // assignment codeword instead of interpreting it. This still independently
  // verifies placement, error correction, and module mapping.
  assert.equal(decoded.getText(), '\uFFFAZABC')
  assert.equal(decoded.getECLevel(), '4')
})

test('ZXing structurally decodes a Structured Append MaxiCode', () => {
  const generated = new MaxiCodeCore('ABC', {
    mode: 4,
    structuredAppend: { index: 3, count: 7 },
  }).generate()
  const decoded = new MaxiCodeDecoder().decode(toBitMatrix(generated.modules))

  // ZXing exposes the Structured Append header as ordinary Code Set A data.
  assert.equal(decoded.getText(), '\uFFFCVABC')
  assert.equal(decoded.getECLevel(), '4')
})

test('ZXing independently extracts and verifies Mode 6 codewords and ECC', () => {
  const generated = new MaxiCodeCore('READER CONFIGURATION', { mode: 6 }).generate()
  const extracted = new MaxiCodeBitMatrixParser(toBitMatrix(generated.modules)).readCodewords()
  const decoder = new MaxiCodeDecoder()

  assert.deepEqual(extracted, generated.codewords)
  assert.equal(extracted[0] & 0x0f, 6)
  assert.equal(decoder.correctErrors(extracted, 0, 10, 10, MaxiCodeDecoder.ALL), 0)
  assert.equal(decoder.correctErrors(extracted, 20, 84, 40, MaxiCodeDecoder.EVEN), 0)
  assert.equal(decoder.correctErrors(extracted, 20, 84, 40, MaxiCodeDecoder.ODD), 0)
  assert.throws(
    () => decoder.decode(toBitMatrix(generated.modules)),
    /FormatException/,
  )
})
