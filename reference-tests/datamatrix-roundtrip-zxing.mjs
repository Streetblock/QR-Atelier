import test from 'node:test'
import assert from 'node:assert/strict'
import { DmCore } from '../libs/DMcore.js'

function matrixToLuminance(result, quietZone = 4, moduleSize = 4) {
  const width = (result.cols + quietZone * 2) * moduleSize
  const height = (result.rows + quietZone * 2) * moduleSize
  const luminance = new Uint8ClampedArray(width * height).fill(255)
  for (let y = 0; y < result.rows; y += 1) {
    for (let x = 0; x < result.cols; x += 1) {
      if (!result.modules[y][x]) continue
      for (let moduleY = 0; moduleY < moduleSize; moduleY += 1) {
        for (let moduleX = 0; moduleX < moduleSize; moduleX += 1) {
          const targetY = (y + quietZone) * moduleSize + moduleY
          const targetX = (x + quietZone) * moduleSize + moduleX
          luminance[targetY * width + targetX] = 0
        }
      }
    }
  }
  return { luminance, width, height }
}

test('Data Matrix symbols roundtrip through the ZXing decoder', async () => {
  const {
    MultiFormatReader,
    BarcodeFormat,
    DecodeHintType,
    BinaryBitmap,
    HybridBinarizer,
    RGBLuminanceSource,
  } = await import('@zxing/library')
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX]]])
  const cases = [
    ['ABC', {}],
    ['ABC', { shape: 'rectangle' }],
    ['1234567890', { symbolSize: '8x32' }],
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', {}],
    ['abcdefghijklmnopqrstuvwxyz', {}],
    ['ABC>123*XYZ', {}],
    ['^^^^^^^^^^^^', {}],
    ['Grüße aus Köln', { encoding: 'iso-8859-1' }],
    ['A'.repeat(400), {}],
    ['A'.repeat(2300), {}],
  ]

  for (const [payload, options] of cases) {
    const generated = new DmCore(payload, options).generate()
    const { luminance, width, height } = matrixToLuminance(generated)
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, width, height)))
    const decoded = new MultiFormatReader().decode(bitmap, hints)
    assert.equal(decoded.getText(), payload, `${generated.rows}x${generated.cols}`)
  }
})
