import test from 'node:test'
import assert from 'node:assert/strict'

import { formatRegistry } from '../formats/index.js'

test('registers the unified interactive encoder set deterministically', () => {
  assert.deepEqual(formatRegistry.list().map(({ id }) => id), [
    'qr',
    'qr-model-1',
    'microqr',
    'rmqr',
    'datamatrix',
    'aztec',
    'maxi-code',
  ])
})

test('renders QR Model 1 and rMQR through their isolated adapters', () => {
  const options = {
    ...formatRegistry.defaults(),
    errorCorrectionLevel: 'M',
    colorStart: '#111827',
    colorEnd: '#2563eb',
    dotStyle: 'square',
    cornerStyle: 'square',
    logo: null,
  }
  assert.match(formatRegistry.createRenderer('qr-model-1', {
    payload: 'LEGACY', size: 256, options,
  }).render(), /^<svg\b/)
  assert.match(formatRegistry.createRenderer('rmqr', {
    payload: 'RMQR', size: 256, options,
  }).render(), /^<svg\b/)
})
