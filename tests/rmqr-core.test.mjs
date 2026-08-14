import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { RMqrCore, RMQR_VERSIONS } from '../libs/RMQRcore.js'
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
