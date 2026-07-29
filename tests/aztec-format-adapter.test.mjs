import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRegistry } from '../formats/index.js'

test('registers and renders Aztec through its format adapter', () => {
  assert.equal(formatRegistry.has('aztec'), true)
  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    ...formatRegistry.defaults(),
  }
  assert.equal(options.aztecStyle, 'square')
  const renderer = formatRegistry.createRenderer('aztec', {
    payload: 'ABC123',
    size: 256,
    options,
  })
  assert.match(renderer.render(), /^<svg\b/)
})
