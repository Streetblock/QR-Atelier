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

import { QrCore, QrSegment, calculateQrStructuredAppendParity } from '../libs/QRcore.js'

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

test('round-trips and reassembles the maximum set of 16 symbols', () => {
  const parts = Array.from({ length: 16 }, (_, index) => `PART-${String(index + 1).padStart(2, '0')}/`)
  const completeMessage = parts.join('')
  const parity = calculateQrStructuredAppendParity(completeMessage)
  const decodedParts = []

  for (const [index, data] of [...parts.entries()].reverse()) {
    const generated = new QrCore(data, {
      errorCorrectionLevel: 'M',
      structuredAppend: { position: index + 1, total: parts.length, parity },
    }).generate()
    const decoded = decodeQr(generated.modules)
    const metadata = decoded.getResultMetadata()
    const sequence = metadata.get(ResultMetadataType.STRUCTURED_APPEND_SEQUENCE)

    assert.equal(sequence, (index << 4) | 0x0f)
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_PARITY), parity)
    decodedParts.push({ index: sequence >> 4, text: decoded.getText() })
  }

  decodedParts.sort((left, right) => left.index - right.index)
  assert.equal(decodedParts.map(({ text }) => text).join(''), completeMessage)
})

test('decodes structured append across QR versions and error correction levels', () => {
  const cases = [
    { version: 1, errorCorrectionLevel: 'L' },
    { version: 5, errorCorrectionLevel: 'M' },
    { version: 10, errorCorrectionLevel: 'Q' },
    { version: 20, errorCorrectionLevel: 'H' },
    { version: 40, errorCorrectionLevel: 'L' },
  ]

  for (const { version, errorCorrectionLevel } of cases) {
    const data = `V${version}-${errorCorrectionLevel}`
    const generated = new QrCore(data, {
      errorCorrectionLevel,
      minVersion: version,
      maxVersion: version,
      structuredAppend: { position: 2, total: 3, parity: 0xa5 },
    }).generate()
    const decoded = decodeQr(generated.modules, 4, version >= 20 ? 3 : 6)
    const metadata = decoded.getResultMetadata()

    assert.equal(generated.version, version)
    assert.equal(decoded.getText(), data)
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_SEQUENCE), 0x12)
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_PARITY), 0xa5)
  }
})

test('decodes structured append with every supported data-mode strategy', () => {
  const cases = [
    ['12345678901234567890', { mode: 'numeric' }],
    ['ALPHA 12345/$%+', { mode: 'alphanumeric' }],
    ['Byte ÄÖ', { mode: 'byte' }],
    ['A12345678901234567890z', { mode: 'auto' }],
    ['', { segments: [
      QrSegment.numeric('123456'),
      QrSegment.alphanumeric('ABC'),
      QrSegment.byte(' ä', { encoding: 'utf-8' }),
    ] }],
  ]

  for (const [data, options] of cases) {
    const generated = new QrCore(data, {
      ...options,
      errorCorrectionLevel: 'Q',
      structuredAppend: { position: 1, total: 2, parity: 0x5a },
    }).generate()
    const decoded = decodeQr(generated.modules)
    const metadata = decoded.getResultMetadata()

    assert.equal(decoded.getText(), data || '123456ABC ä')
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_SEQUENCE), 0x01)
    assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_PARITY), 0x5a)
  }
})

test('preserves raw byte segments inside a structured-append symbol', () => {
  const bytes = [0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff]
  const generated = new QrCore('', {
    eci: false,
    segments: [QrSegment.bytes(bytes)],
    structuredAppend: { position: 2, total: 2, parity: calculateQrStructuredAppendParity(bytes) },
  }).generate()
  const decoded = decodeQr(generated.modules)
  const metadata = decoded.getResultMetadata()
  const byteSegments = metadata.get(ResultMetadataType.BYTE_SEGMENTS)

  assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_SEQUENCE), 0x11)
  assert.equal(metadata.get(ResultMetadataType.STRUCTURED_APPEND_PARITY), 0xff)
  assert.deepEqual(Array.from(byteSegments[0]), bytes)
})
