import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRegistry } from '../formats/index.js'

test('registers and renders Data Matrix through its format adapter', () => {
  assert.equal(formatRegistry.has('datamatrix'), true)
  assert.equal(formatRegistry.get('datamatrix').capabilities.logo, false)
  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    dotStyle: 'square',
    ...formatRegistry.defaults(),
  }
  const renderer = formatRegistry.createRenderer('datamatrix', {
    payload: 'ABC123',
    size: 256,
    options,
  })
  assert.match(renderer.render(), /^<svg\b/)
})
