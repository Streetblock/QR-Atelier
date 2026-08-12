import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRegistry } from '../formats/index.js'

test('registers and renders MaxiCode through its format adapter', () => {
  assert.equal(formatRegistry.has('maxi-code'), true)
  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    ...formatRegistry.defaults(),
  }
  assert.equal(options.maxiCodeMode, '4')
  assert.equal(options.maxiCodeEncoding, 'iso-8859-1')
  const renderer = formatRegistry.createRenderer('maxi-code', {
    payload: 'ABC123',
    size: 256,
    options,
  })
  assert.match(renderer.render(), /^<svg\b/)
})

test('supplies valid mode-specific MaxiCode postal defaults', () => {
  const modeField = formatRegistry.get('maxi-code').fields.find((field) => field.key === 'maxiCodeMode')
  assert.deepEqual(modeField.options.map(([value]) => value), ['4', '5', '6', '2', '3'])
  assert.deepEqual(modeField.update('2', { maxiCodePostalCode: '' }), {
    maxiCodeMode: '2',
    maxiCodePostalCode: '336091062',
  })
  assert.deepEqual(modeField.update('3', { maxiCodePostalCode: '123' }), {
    maxiCodeMode: '3',
    maxiCodePostalCode: 'K1A0B1',
  })
})
test('offers UTF-8 with ECI 26 through the MaxiCode adapter', () => {
  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    ...formatRegistry.defaults(),
    maxiCodeEncoding: 'utf-8',
  }
  const renderer = formatRegistry.createRenderer('maxi-code', {
    payload: 'Gr\u00fc\u00dfe',
    size: 256,
    options,
  })

  assert.match(renderer.render(), /^<svg\b/)
})

test('renders reader-programming Mode 6 through the MaxiCode adapter', () => {
  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    ...formatRegistry.defaults(),
    maxiCodeMode: '6',
  }
  assert.match(formatRegistry.createRenderer('maxi-code', {
    payload: 'READER CONFIGURATION',
    size: 256,
    options,
  }).render(), /^<svg\b/)
})

test('configures Structured Append through the MaxiCode adapter', () => {
  const format = formatRegistry.get('maxi-code')
  const countField = format.fields.find((field) => field.key === 'maxiCodeStructuredAppendCount')
  assert.deepEqual(countField.update('3', { maxiCodeStructuredAppendIndex: '8' }), {
    maxiCodeStructuredAppendCount: '3',
    maxiCodeStructuredAppendIndex: '3',
  })
  const indexField = format.fields.find((field) => field.key === 'maxiCodeStructuredAppendIndex')
  assert.deepEqual(indexField.update('8', { maxiCodeStructuredAppendCount: '3' }), {
    maxiCodeStructuredAppendIndex: '3',
  })

  const options = {
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    ...formatRegistry.defaults(),
    maxiCodeStructuredAppendCount: '3',
    maxiCodeStructuredAppendIndex: '2',
  }
  assert.match(formatRegistry.createRenderer('maxi-code', {
    payload: 'ABC',
    size: 256,
    options,
  }).render(), /^<svg\b/)
})
