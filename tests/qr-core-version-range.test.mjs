import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { QrCore, QrSegment } from '../libs/QRcore.js'

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

test('can force byte-only mode instead of automatic alphanumeric compression', () => {
  const auto = new QrCore('A'.repeat(180), {
    errorCorrectionLevel: 'Q',
  }).generate()
  const byteOnly = new QrCore('A'.repeat(180), {
    errorCorrectionLevel: 'Q',
    mode: 'byte',
  }).generate()

  assert.ok(auto.version < byteOnly.version)
  assert.equal(byteOnly.version, 12)
  assertMatrixShape(byteOnly)
})

test('selects the smallest version for mixed byte and numeric input at every error correction level', () => {
  const cases = {
    L: 'a12345678901234567890',
    M: 'a1234567890123456',
    Q: 'a12345678901',
    H: 'a123456',
  }

  for (const [errorCorrectionLevel, data] of Object.entries(cases)) {
    const result = new QrCore(data, { errorCorrectionLevel }).generate()
    assert.equal(result.version, 1)
    assertMatrixShape(result)
  }
})

test('uses numeric segments inside otherwise alphanumeric input', () => {
  const cases = {
    L: 'A1234567890123456789012345',
    M: 'A12345678901234567890',
    Q: 'A1234567890123456',
    H: 'A1234567890',
  }

  for (const [errorCorrectionLevel, data] of Object.entries(cases)) {
    const automatic = new QrCore(data, { errorCorrectionLevel }).generate()
    const alphanumericOnly = new QrCore(data, {
      errorCorrectionLevel,
      mode: 'alphanumeric',
    }).generate()
    assert.equal(automatic.version, 1)
    assert.equal(alphanumericOnly.version, 2)
    assertMatrixShape(automatic)
  }
})

test('does not spend ECI bits on ASCII-only byte segments', () => {
  const versionOneByteCapacities = { L: 17, M: 14, Q: 11, H: 7 }

  for (const [errorCorrectionLevel, length] of Object.entries(versionOneByteCapacities)) {
    const result = new QrCore('a'.repeat(length), {
      errorCorrectionLevel,
      mode: 'byte',
    }).generate()
    assert.equal(result.version, 1)
    assertMatrixShape(result)
  }
})

test('retains UTF-8 ECI when non-ASCII byte data needs it', () => {
  const data = '\u00c4'.repeat(7)
  const withEci = new QrCore(data, {
    errorCorrectionLevel: 'M',
    mode: 'byte',
  }).generate()
  const withoutEci = new QrCore(data, {
    errorCorrectionLevel: 'M',
    mode: 'byte',
    eci: false,
  }).generate()

  assert.equal(withEci.version, 2)
  assert.equal(withoutEci.version, 1)
  assertMatrixShape(withEci)
})

test('can force low-level numeric and alphanumeric modes', () => {
  const numeric = new QrCore('123456789012345678901234567890', {
    errorCorrectionLevel: 'H',
    mode: 'numeric',
    maxVersion: 2,
  }).generate()
  const alphanumeric = new QrCore('HELLO WORLD 12345', {
    errorCorrectionLevel: 'H',
    mode: 'alphanumeric',
    maxVersion: 2,
  }).generate()

  assert.equal(numeric.version, 2)
  assert.equal(alphanumeric.version, 2)
  assertMatrixShape(numeric)
  assertMatrixShape(alphanumeric)
})

test('supports manual low-level QR segments', () => {
  const result = new QrCore('', {
    errorCorrectionLevel: 'M',
    segments: [
      QrSegment.numeric('1234567890'),
      QrSegment.alphanumeric('HELLO WORLD'),
      QrSegment.byte(' ue', { encoding: 'iso-8859-1' }),
      QrSegment.bytes([0x20, 0x41]),
    ],
  }).generate()

  assert.ok(result.version <= 3)
  assertMatrixShape(result)
})

test('supports Latin-1 and Windows-1252 byte encodings without dependencies', () => {
  const utf8 = new QrCore('Ä'.repeat(20), {
    errorCorrectionLevel: 'H',
    mode: 'byte',
    encoding: 'utf-8',
  }).generate()
  const latin1 = new QrCore('Ä'.repeat(20), {
    errorCorrectionLevel: 'H',
    mode: 'byte',
    encoding: 'iso-8859-1',
  }).generate()
  const windows1252 = new QrCore('€'.repeat(20), {
    errorCorrectionLevel: 'H',
    mode: 'byte',
    encoding: 'windows-1252',
  }).generate()

  assert.ok(latin1.version < utf8.version)
  assert.equal(latin1.version, windows1252.version)
  assertMatrixShape(latin1)
  assertMatrixShape(windows1252)
})

test('can disable ECI when raw byte payload compatibility is needed', () => {
  const withEci = new QrCore('ÄÄÄ', {
    mode: 'byte',
    encoding: 'iso-8859-1',
  }).generate()
  const withoutEci = new QrCore('ÄÄÄ', {
    mode: 'byte',
    encoding: 'iso-8859-1',
    eci: false,
  }).generate()

  assert.equal(withEci.version, withoutEci.version)
  assertMatrixShape(withEci)
  assertMatrixShape(withoutEci)
})

test('rejects characters that are not representable in the selected byte encoding', () => {
  assert.throws(
    () => new QrCore('€', { mode: 'byte', encoding: 'iso-8859-1' }).generate(),
    /cannot be encoded as ISO-8859-1/,
  )
  assert.throws(
    () => new QrCore('漢', { mode: 'byte', encoding: 'windows-1252' }).generate(),
    /cannot be encoded as Windows-1252/,
  )
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

test('starts QR padding with 0xEC independently of the current data length', () => {
  const result = new QrCore('https://example.com', { errorCorrectionLevel: 'Q' }).generate()
  const bits = result.modules.map((row) => row.map(Number).join('')).join('')
  const fingerprint = createHash('sha256').update(bits).digest('hex')

  assert.equal(result.version, 2)
  assert.equal(fingerprint, 'f58680ccc546ffba8dcd24339afa4d9fc3cf3732f92fb2fdf1e6bccc59de287d')
})
