import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'

function matrixToRgbPixels(modules, quietZone = 8, moduleSize = 6) {
  const inner = modules.length
  const side = (inner + quietZone * 2) * moduleSize
  const pixels = new Uint8ClampedArray(side * side * 4)

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const moduleX = Math.floor(x / moduleSize) - quietZone
      const moduleY = Math.floor(y / moduleSize) - quietZone
      const dark = moduleX >= 0 && moduleX < inner && moduleY >= 0 && moduleY < inner && modules[moduleY][moduleX]
      const v = dark ? 0 : 255
      const idx = (y * side + x) * 4
      pixels[idx] = v
      pixels[idx + 1] = v
      pixels[idx + 2] = v
      pixels[idx + 3] = 255
    }
  }

  return { pixels, width: side, height: side }
}

test('aztec roundtrip decodes with zxing when available', async (t) => {
  let zxing
  try {
    zxing = await import('@zxing/library')
  } catch {
    t.skip('@zxing/library not installed')
    return
  }

  const payload = 'AZTEC ROUNDTRIP 123'
  const aztec = new AztecCore(payload, { mode: 'auto' }).generate()
  const { pixels, width, height } = matrixToRgbPixels(aztec.modules)

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

  const luminance = new RGBLuminanceSource(pixels, width, height)
  const bitmap = new BinaryBitmap(new HybridBinarizer(luminance))
  const reader = new MultiFormatReader()
  const result = reader.decode(bitmap, hints)

  assert.equal(result.getText(), payload)
})

