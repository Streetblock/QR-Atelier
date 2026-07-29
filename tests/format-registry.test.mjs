import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FormatRegistry } from '../formats/FormatRegistry.js'
import { formatRegistry } from '../formats/index.js'

test('registers QR as the base format with its UI capabilities', () => {
  assert.equal(formatRegistry.has('qr'), true)
  assert.deepEqual(formatRegistry.get('qr').capabilities, {
    dotStyle: true,
    cornerStyle: true,
    logo: true,
  })
})

test('rejects malformed and duplicate format adapters', () => {
  const createRenderer = () => ({ render: () => '<svg></svg>' })
  assert.throws(() => new FormatRegistry([]), /at least one/)
  assert.throws(
    () => new FormatRegistry([{ id: 'Bad ID', label: 'Bad', filePrefix: 'bad', createRenderer }]),
    /lowercase id/,
  )
  assert.throws(() => new FormatRegistry([
    { id: 'demo', label: 'Demo', filePrefix: 'demo', createRenderer },
    { id: 'demo', label: 'Duplicate', filePrefix: 'duplicate', createRenderer },
  ]), /Duplicate/)
})

test('creates renderable QR SVG output through the registry interface', () => {
  const options = {
    errorCorrectionLevel: 'Q',
    colorStart: '#0f172a',
    colorEnd: '#0ea5e9',
    dotStyle: 'square',
    cornerStyle: 'square',
    logo: null,
    ...formatRegistry.defaults(),
  }
  const renderer = formatRegistry.createRenderer('qr', {
    payload: 'ABC123',
    size: 256,
    options,
  })
  assert.match(renderer.render(), /^<svg\b/)
})

test('keeps encoder imports and format controls outside the shared app shell', () => {
  const root = new URL('../', import.meta.url)
  const app = readFileSync(fileURLToPath(new URL('app.js', root)), 'utf8')
  const html = readFileSync(fileURLToPath(new URL('index.html', root)), 'utf8')

  assert.match(app, /formats\/index\.js/)
  assert.doesNotMatch(app, /libs\/(?:QR|MicroQR|DM|Aztec|MaxiCode)/)
  assert.match(html, /id="format-options"/)
  assert.doesNotMatch(html, /<option value="qr"/)
})
