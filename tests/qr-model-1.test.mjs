import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { QrCore } from '../libs/QRcore.js'

function fingerprint(modules) {
  const bits = modules.map((row) => row.map(Number).join('')).join('')
  return createHash('sha256').update(bits).digest('hex')
}

test('keeps QR Model 2 as the default', () => {
  const result = new QrCore('DEFAULT MODEL').generate()
  assert.equal(result.model, 2)
})

test('generates QR Model 1 versions 1 and 2 at every error-correction level', () => {
  for (const version of [1, 2]) {
    for (const errorCorrectionLevel of ['L', 'M', 'Q', 'H']) {
      const result = new QrCore(`V${version}${errorCorrectionLevel}`, {
        model: 1,
        errorCorrectionLevel,
        minVersion: version,
        maxVersion: version,
      }).generate()

      assert.equal(result.model, 1)
      assert.equal(result.version, version)
      assert.equal(result.size, version * 4 + 17)
      assert.ok(result.modules.every((row) => row.every((module) => typeof module === 'boolean')))
    }
  }
})

test('matches the ZXing-C++ QR Model 1 version 2 reference symbol', () => {
  const result = new QrCore('QR Code Model 1 ', {
    model: 1,
    errorCorrectionLevel: 'M',
    minVersion: 2,
    maxVersion: 2,
    mode: 'byte',
    encoding: 'iso-8859-1',
    eci: false,
    mask: 5,
  }).generate()

  assert.equal(
    fingerprint(result.modules),
    'cda8f54a55b3b4296866b3e6334efd73e2822cf5e2952c3cea8a1e41e24a7642',
  )
})

test('uses the additional Model 1 version 2 capacity', () => {
  const result = new QrCore('a'.repeat(34), {
    model: 1,
    mode: 'byte',
    errorCorrectionLevel: 'L',
    minVersion: 2,
    maxVersion: 2,
  }).generate()

  assert.equal(result.version, 2)
  assert.throws(
    () => new QrCore('a'.repeat(35), {
      model: 1,
      mode: 'byte',
      errorCorrectionLevel: 'L',
      minVersion: 2,
      maxVersion: 2,
    }).generate(),
    /configured QR version range/,
  )
})

test('rejects unsupported Model 1 features and versions', () => {
  assert.throws(
    () => new QrCore('payload', { model: 1, maxVersion: 3 }).generate(),
    /Model 1 versions must be between 1 and 2/,
  )
  assert.throws(
    () => new QrCore('Ä', { model: 1, mode: 'byte' }).generate(),
    /Model 1 does not support ECI/,
  )
  assert.throws(
    () => new QrCore('payload', { model: 3 }).generate(),
    /Unsupported QR model/,
  )
})

