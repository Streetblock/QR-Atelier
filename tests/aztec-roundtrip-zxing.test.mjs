import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

function matrixToLuminance(modules, quietZone = 8, moduleSize = 6) {
  const inner = modules.length
  const side = (inner + quietZone * 2) * moduleSize
  const luminance = new Uint8ClampedArray(side * side)

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const moduleX = Math.floor(x / moduleSize) - quietZone
      const moduleY = Math.floor(y / moduleSize) - quietZone
      const dark = moduleX >= 0 && moduleX < inner && moduleY >= 0 && moduleY < inner && modules[moduleY][moduleX]
      luminance[y * side + x] = dark ? 0 : 255
    }
  }

  return { luminance, width: side, height: side }
}

test('zxing library is installed for aztec integration checks', async (t) => {
  let zxing
  try {
    zxing = await import('@zxing/library')
  } catch {
    t.skip('@zxing/library not installed')
    return
  }
  assert.ok(zxing)
})

test('aztec roundtrip decodes with zxing for multiple payloads', async (t) => {
  let zxing
  try {
    zxing = await import('@zxing/library')
  } catch {
    t.skip('@zxing/library not installed')
    return
  }
  const {
    MultiFormatReader,
    BarcodeFormat,
    DecodeHintType,
    BinaryBitmap,
    HybridBinarizer,
    RGBLuminanceSource,
  } = zxing

  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.AZTEC])
  const payloads = [
    'AZTEC ROUNDTRIP 123',
    'https://example.com/path?a=1&b=2',
    'Plain ASCII payload 42',
    'Longer payload for aztec decode check 0123456789 abcdefghijklmnopqrstuvwxyz',
  ]

  for (const payload of payloads) {
    const aztec = new AztecCore(payload, { mode: 'auto' }).generate()
    const { luminance, width, height } = matrixToLuminance(aztec.modules)
    const source = new RGBLuminanceSource(luminance, width, height)
    const bitmap = new BinaryBitmap(new HybridBinarizer(source))
    const reader = new MultiFormatReader()
    const result = reader.decode(bitmap, hints)
    assert.equal(result.getText(), payload)
  }
})
