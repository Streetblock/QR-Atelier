import assert from 'node:assert/strict'
import test from 'node:test'

import { QrCore } from '../libs/QRcore.js'

function assertMatrixShape(result) {
  assert.equal(result.size, result.version * 4 + 17)
  assert.equal(result.modules.length, result.size)
  for (const row of result.modules) {
    assert.equal(row.length, result.size)
    for (const module of row) {
      assert.equal(typeof module, 'boolean')
    }
  }
}

test('generates QR versions above the former version 10 limit', () => {
  const result = new QrCore('a'.repeat(180), {
    errorCorrectionLevel: 'Q',
    minVersion: 1,
    maxVersion: 40,
  }).generate()

  assert.ok(result.version > 10)
  assertMatrixShape(result)
})

test('can force QR version 40 for large byte payloads', () => {
  const result = new QrCore('x'.repeat(2500), {
    errorCorrectionLevel: 'L',
    minVersion: 40,
    maxVersion: 40,
  }).generate()

  assert.equal(result.version, 40)
  assert.equal(result.size, 177)
  assertMatrixShape(result)
})

test('supports all error correction levels at version 11 and above', () => {
  for (const errorCorrectionLevel of ['L', 'M', 'Q', 'H']) {
    const result = new QrCore(`${errorCorrectionLevel}:${'payload'.repeat(10)}`, {
      errorCorrectionLevel,
      minVersion: 11,
      maxVersion: 11,
    }).generate()

    assert.equal(result.version, 11)
    assert.equal(result.errorCorrectionLevel, errorCorrectionLevel)
    assertMatrixShape(result)
  }
})

test('compresses digit-only input with numeric mode', () => {
  const result = new QrCore('123456789012345678901234567890', {
    errorCorrectionLevel: 'H',
    minVersion: 1,
    maxVersion: 2,
  }).generate()

  assert.equal(result.version, 2)
  assertMatrixShape(result)
})

test('compresses QR alphanumeric input with alphanumeric mode', () => {
  const result = new QrCore('HELLO WORLD 12345', {
    errorCorrectionLevel: 'H',
    minVersion: 1,
    maxVersion: 2,
  }).generate()

  assert.equal(result.version, 2)
  assertMatrixShape(result)
})

test('keeps UTF-8 byte fallback for unsupported alphanumeric characters', () => {
  const result = new QrCore('HELLO üöä â WORLD 123', {
    errorCorrectionLevel: 'M',
    minVersion: 1,
    maxVersion: 5,
  }).generate()

  assert.ok(result.version <= 5)
  assertMatrixShape(result)
})

test('reports overflow against the configured version range', () => {
  assert.throws(
    () => new QrCore('a'.repeat(180), { errorCorrectionLevel: 'Q', maxVersion: 10 }).generate(),
    /configured QR version range/,
  )
})

test('rejects invalid QR versions outside the standard range', () => {
  assert.throws(() => new QrCore('payload', { maxVersion: 41 }).generate(), /between 1 and 40/)
  assert.throws(() => new QrCore('payload', { minVersion: 0 }).generate(), /between 1 and 40/)
})
