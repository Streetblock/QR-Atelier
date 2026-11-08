import assert from 'node:assert/strict'
import test from 'node:test'

import zxing from '@zxing/library'

import { QrCore, QrSegment } from '../libs/QRcore.js'

const {
  BarcodeFormat,
  BinaryBitmap,
  BitMatrix,
  DecodeHintType,
  MultiFormatReader,
} = zxing

function decodeQr(modules) {
  const quietZone = 4
  const moduleSize = 4
  const size = (modules.length + quietZone * 2) * moduleSize
  const matrix = new BitMatrix(size, size)
  for (let y = 0; y < modules.length; y += 1) {
    for (let x = 0; x < modules[y].length; x += 1) {
      if (modules[y][x]) {
        matrix.setRegion(
          (quietZone + x) * moduleSize,
          (quietZone + y) * moduleSize,
          moduleSize,
          moduleSize,
        )
      }
    }
  }
  const bitmap = new BinaryBitmap({
    getWidth: () => size,
    getHeight: () => size,
    getBlackMatrix: () => matrix,
  })
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]])
  return new MultiFormatReader().decode(bitmap, hints).getText()
}

test('encodes Unicode text in manual QR Kanji mode', () => {
  const result = new QrCore('日本', {
    errorCorrectionLevel: 'M',
    mode: 'kanji',
    minVersion: 1,
    maxVersion: 1,
    mask: 0,
  }).generate()

  assert.equal(result.version, 1)
  assert.equal(decodeQr(result.modules), '日本')
})

test('encodes raw Shift JIS pairs exactly like Unicode Kanji input', () => {
  const options = {
    errorCorrectionLevel: 'M',
    minVersion: 1,
    maxVersion: 1,
    mask: 3,
  }
  const unicode = new QrCore('', {
    ...options,
    segments: [QrSegment.kanji('日本')],
  }).generate()
  const raw = new QrCore('', {
    ...options,
    segments: [QrSegment.kanjiBytes([0x93, 0xfa, 0x96, 0x7b])],
  }).generate()

  assert.deepEqual(raw.modules, unicode.modules)
  assert.equal(decodeQr(raw.modules), '日本')
})

test('supports Kanji segments alongside other manual QR modes', () => {
  const result = new QrCore('', {
    errorCorrectionLevel: 'Q',
    segments: [
      QrSegment.alphanumeric('JP:'),
      QrSegment.kanji('日本'),
      QrSegment.numeric('2026'),
    ],
  }).generate()

  assert.equal(decodeQr(result.modules), 'JP:日本2026')
})

test('validates manual QR Kanji input and Shift JIS byte pairs', () => {
  assert.throws(
    () => new QrCore('ASCII', { mode: 'kanji' }).generate(),
    /cannot be encoded in QR Kanji mode/,
  )
  assert.throws(
    () => QrSegment.kanjiBytes([0x93]),
    /complete two-byte Shift JIS characters/,
  )
  assert.throws(
    () => QrSegment.kanjiBytes([0x81, 0x7f]),
    /not valid in QR Kanji mode/,
  )
})
