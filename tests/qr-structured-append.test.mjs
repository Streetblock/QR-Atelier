import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  LuminanceSource,
  MultiFormatReader,
  ResultMetadataType,
} from '@zxing/library'

import { QrCore, calculateQrStructuredAppendParity } from '../libs/QRcore.js'

class MatrixLuminanceSource extends LuminanceSource {
  constructor(luminance, width, height) {
    super(width, height)
    this.luminance = luminance
  }

  getRow(y, row = new Uint8ClampedArray(this.getWidth())) {
    row.set(this.luminance.subarray(y * this.getWidth(), (y + 1) * this.getWidth()))
    return row
  }

  getMatrix() {
    return this.luminance
  }
}

function decodeQr(modules, quietZone = 4, moduleSize = 6) {
  const moduleCount = modules.length
  const size = (moduleCount + quietZone * 2) * moduleSize
  const luminance = new Uint8ClampedArray(size * size).fill(255)

  for (let y = 0; y < moduleCount; y += 1) {
    for (let x = 0; x < moduleCount; x += 1) {
      if (!modules[y][x]) continue
      for (let pixelY = 0; pixelY < moduleSize; pixelY += 1) {
        const offset = ((quietZone + y) * moduleSize + pixelY) * size + (quietZone + x) * moduleSize
        luminance.fill(0, offset, offset + moduleSize)
      }
    }
  }

  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  ])
  const source = new MatrixLuminanceSource(luminance, size, size)
  return new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(source)), hints)
}

test('calculates structured-append parity over encoded message bytes', () => {
  assert.equal(calculateQrStructuredAppendParity([0x01, 0x02, 0x03]), 0x00)
  assert.equal(calculateQrStructuredAppendParity('Ä'), 0x47)
  assert.equal(calculateQrStructuredAppendParity('Ä', { encoding: 'iso-8859-1' }), 0xc4)
})

test('independent decoder reads structured-append sequence and parity metadata', () => {
  const completeMessage = 'HELLO ÄWORLD Ö'
  const parity = calculateQrStructuredAppendParity(completeMessage)
  const parts = ['HELLO Ä', 'WORLD Ö']

  for (const [index, data] of parts.entries()) {
    const generated = new QrCore(data, {
      errorCorrectionLevel: 'M',
      structuredAppend: { position: index + 1, total: parts.length, parity },
    }).generate()
    const decoded = decodeQr(generated.modules)
    const metadata = decoded.getResultMetadata()

    assert.equal(decoded.getText(), data)
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_SEQUENCE), (index << 4) | (parts.length - 1))
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_PARITY), parity)
    assert.deepEqual(generated.structuredAppend, {
      position: index + 1,
      total: parts.length,
      parity,
    })
  }
})

test('accounts for the 20-bit structured-append header during version selection', () => {
  const common = {
    errorCorrectionLevel: 'M',
    mode: 'alphanumeric',
    maxVersion: 1,
    structuredAppend: { position: 1, total: 2, parity: 0 },
  }

  assert.equal(new QrCore('A'.repeat(17), common).generate().version, 1)
  assert.throws(
    () => new QrCore('A'.repeat(18), common).generate(),
    /configured QR version range/,
  )
})

test('validates structured-append metadata against the QR limits', () => {
  const invalidCases = [
    [{ position: 1, total: 1, parity: 0 }, /total.*between 2 and 16/],
    [{ position: 1, total: 17, parity: 0 }, /total.*between 2 and 16/],
    [{ position: 0, total: 2, parity: 0 }, /position.*between 1 and total/],
    [{ position: 3, total: 2, parity: 0 }, /position.*between 1 and total/],
    [{ position: 1, total: 2, parity: -1 }, /parity.*between 0 and 255/],
    [{ position: 1, total: 2, parity: 256 }, /parity.*between 0 and 255/],
  ]

  for (const [structuredAppend, message] of invalidCases) {
    assert.throws(() => new QrCore('A', { structuredAppend }).generate(), message)
  }
})
