import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRegistry } from '../formats/index.js'

test('registers and renders Micro QR through its format adapter', () => {
  assert.equal(formatRegistry.has('microqr'), true)
  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    dotStyle: 'square',
    ...formatRegistry.defaults(),
  }
  assert.equal(options.microMaxVersion, 'M4')
  const renderer = formatRegistry.createRenderer('microqr', {
    payload: '12345',
    size: 256,
    options,
  })
  assert.match(renderer.render(), /^<svg\b/)
})
