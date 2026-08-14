import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { RMqrCore, RMqrSegment, RMQR_VERSIONS } from '../libs/RMQRcore.js'
import { QrSvgRenderer } from '../libs/QRsvg.js'

function matrixHash(modules) {
  return createHash('sha256').update(modules.flat().map(Number).join('')).digest('hex')
}

test('rMQR publishes all 32 ISO symbol sizes', () => {
  assert.equal(RMQR_VERSIONS.length, 32)
  assert.equal(RMQR_VERSIONS[0].name, 'R7x43')
  assert.equal(RMQR_VERSIONS.at(-1).name, 'R17x139')
  assert.equal(new Set(RMQR_VERSIONS.map(({ name }) => name)).size, 32)
})

test('every rMQR size generates at M and H', () => {
  for (const version of RMQR_VERSIONS) {
    for (const errorCorrectionLevel of ['M', 'H']) {
      const result = new RMqrCore('1', { version: version.name, errorCorrectionLevel }).generate()
      assert.equal(result.version, version.name)
      assert.equal(result.width, version.width)
      assert.equal(result.height, version.height)
      assert.equal(result.modules.length, version.height)
      assert.ok(result.modules.every((row) => row.length === version.width))
      assert.ok(result.modules.flat().every((module) => typeof module === 'boolean'))
    }
  }
})

test('single-block matrices match the independent rmqrcode reference', () => {
  const numeric = new RMqrCore('123456789012', { version: 'R7x43', errorCorrectionLevel: 'M', mode: 'numeric' }).generate()
  assert.equal(matrixHash(numeric.modules), '3a90da9a67418925bc5268ba282342e1dba1e9dde8c3520d61be1ec57ef2fdd7')

  const bytes = new RMqrCore('abc', { version: 'R11x27', errorCorrectionLevel: 'M', mode: 'byte' }).generate()
  assert.equal(matrixHash(bytes.modules), 'a2351fbc7aaf9790b70885295ce2af2c60f20d6077cd44f0aec0bef4f5935007')
})

test('maximum multi-block matrix matches the independent Zint encoder', () => {
  const result = new RMqrCore('RMQR REFERENCE', {
    version: 'R17x139',
    errorCorrectionLevel: 'H',
    mode: 'alphanumeric',
  }).generate()
  assert.equal(matrixHash(result.modules), 'b6fa43fb05d708ac9e2ae6b1eef8fe6e0dccccc59eb3975d5945a0e535e2b780')
})

test('automatic mode segmentation uses the narrowest valid modes', () => {
  const result = new RMqrCore('1234ABCD-example').generate()
  assert.deepEqual(result.segments.map(({ mode }) => mode), ['alphanumeric', 'byte'])
})

test('automatically marks non-ASCII UTF-8 data with ECI 26', () => {
  const result = new RMqrCore('é', {
    version: 'R11x27',
    errorCorrectionLevel: 'H',
    mode: 'byte',
  }).generate()
  assert.equal(result.eci, true)
  assert.deepEqual(result.segments.map(({ mode, assignmentNumber }) => ({ mode, assignmentNumber })), [
    { mode: 'eci', assignmentNumber: 26 },
    { mode: 'byte', assignmentNumber: undefined },
  ])
  assert.equal(matrixHash(result.modules), '80b0d5ec2672d956db6a4fdaa17278843b40d598ae316fa5272547d37eb466d4')
})

test('supports ISO-8859-1 and Windows-1252 ECI reference matrices', () => {
  const latin1 = new RMqrCore('', {
    version: 'R11x27',
    errorCorrectionLevel: 'H',
    segments: [
      RMqrSegment.eci(3),
      RMqrSegment.byte('é', { encoding: 'iso-8859-1' }),
    ],
  }).generate()
  assert.equal(matrixHash(latin1.modules), '84ba16572e7bb9bca07cd7cdb038885df279416f8986271250c4c86900929719')

  const windows1252 = new RMqrCore('€', {
    version: 'R11x27',
    errorCorrectionLevel: 'H',
    mode: 'byte',
    encoding: 'windows-1252',
  }).generate()
  assert.equal(windows1252.segments[0].assignmentNumber, 23)
  assert.equal(matrixHash(windows1252.modules), '7e2450075d4ffad1c4849aa00e2217cdd3a4207c2dd8477fb29bb36deea7c929')
})

test('encodes one-, two- and three-byte ECI assignment values', () => {
  const twoByte = new RMqrCore('', {
    version: 'R11x27',
    errorCorrectionLevel: 'H',
    segments: [RMqrSegment.eci(170), RMqrSegment.byte('?')],
  }).generate()
  assert.equal(matrixHash(twoByte.modules), 'f5d3f98d2158639cea1734ac1d4d3d7d876fb78298e222f63e2be29f09a4c360')

  const threeByte = new RMqrCore('', {
    version: 'R11x27',
    errorCorrectionLevel: 'M',
    segments: [RMqrSegment.eci(16384), RMqrSegment.bytes([0xc3, 0xa9])],
  }).generate()
  assert.equal(matrixHash(threeByte.modules), '45026b24a4bf48c58c3dcc468e4403d6aa705b7b73186acf720aa2c7497d46c5')
})

test('omits ECI for ASCII and can disable automatic ECI', () => {
  const ascii = new RMqrCore('ASCII', { mode: 'byte' }).generate()
  assert.equal(ascii.eci, false)
  assert.deepEqual(ascii.segments.map(({ mode }) => mode), ['byte'])

  const rawUtf8 = new RMqrCore('é', { mode: 'byte', eci: false }).generate()
  assert.equal(rawUtf8.eci, false)
  assert.deepEqual(rawUtf8.segments.map(({ mode }) => mode), ['byte'])
})

test('validates rMQR byte encodings, bytes and ECI assignments', () => {
  assert.throws(() => new RMqrCore('€', { encoding: 'iso-8859-1' }).generate(), /cannot be encoded as ISO-8859-1/)
  assert.throws(() => new RMqrCore('x', { encoding: 'shift-jis' }).generate(), /Unsupported rMQR byte encoding/)
  assert.throws(() => RMqrSegment.bytes([256]), /Invalid byte value/)
  assert.throws(() => RMqrSegment.eci(1000000), /between 0 and 999999/)
  assert.throws(() => new RMqrCore('x', { eci: 'yes' }).generate(), /must be true or false/)
})

test('forced modes reject incompatible data and capacity overflow', () => {
  assert.throws(() => new RMqrCore('ABC', { mode: 'numeric' }).generate(), /cannot be encoded/)
  assert.throws(() => new RMqrCore('x'.repeat(200), { version: 'R7x43' }).generate(), /too long/)
  assert.throws(() => new RMqrCore('x', { errorCorrectionLevel: 'Q' }).generate(), /only error correction levels M and H/)
})

test('SVG renderer preserves the rectangular aspect ratio and quiet zone', () => {
  const result = new RMqrCore('abc', { version: 'R11x27' }).generate()
  const renderer = new QrSvgRenderer(result, { size: 350, margin: 2, dotStyle: 'rounded', logo: 'ignored' })
  const dimensions = renderer.getOutputDimensions()
  const svg = renderer.render()
  assert.deepEqual(dimensions, { width: 350, height: 169 })
  assert.match(svg, /viewBox="0 0 31 15"/)
  assert.match(svg, /width="350" height="169"/)
  assert.doesNotMatch(svg, /<image /)
})
