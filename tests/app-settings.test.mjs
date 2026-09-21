import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { QrCore } from '../libs/QRcore.js'
import { QrSvgRenderer } from '../libs/QRsvg.js'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(/^import .*\r?\n/gm, '')

function element() {
  const classes = new Set()
  return {
    value: '', style: {}, textContent: '', innerHTML: '', listeners: {},
    classList: {
      add: (name) => classes.add(name), remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
    },
    addEventListener(name, callback) { this.listeners[name] = callback },
    appendChild(child) { this.children = [child] },
    replaceChildren(...children) { this.children = children; this.innerHTML = '' },
    dispatchEvent(event) { this.listeners[event.type]?.({ target: this }) },
  }
}

function setup(search = '') {
  // Resolve IDs from the shipped HTML so missing controls break initialization.
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, element()]))
  let renderPending
  const context = vm.createContext({
    QrCore, QrSvgRenderer, URLSearchParams, Event, console,
    setTimeout(callback) { renderPending = callback; return 1 },
    clearTimeout() { renderPending = null },
    window: { location: { search } },
    document: {
      getElementById: (id) => elements.get(id) ?? null,
      createElement: element,
      addEventListener() {},
    },
  })
  vm.runInContext(`${source}\nthis.app = new QRPlaygroundApp()`, context)
  return { app: context.app, get: (id) => elements.get(id), flush: () => renderPending?.() }
}

test('initial example uses the agreed text, follows styling and cannot be exported', async () => {
  const { app, get } = setup()
  assert.equal(get('primary-input').value, '')
  assert.equal(app.state.data, '')
  assert.equal(app.hasCode(), false)
  assert.equal(get('download-buttons').classList.contains('hidden'), true)
  assert.equal(get('qr-status').textContent, 'Beispielvorschau – gib deinen eigenen Inhalt ein')
  app.update({ colorStart: '#123456', dotStyle: 'square' })
  const expected = new QrSvgRenderer(new QrCore('Grüße aus dem QR Atelier!').generate(), {
    size: 300, ...app.state.options,
  }).render()
  const normalize = (svg) => svg.replace(/qr-gradient-[a-z0-9]+/g, 'gradient')
  assert.equal(normalize(get('qr-preview').innerHTML), normalize(expected))
  assert.equal(app.hasCode(), false)
  // No Blob/Image/URL download APIs exist in the fixture: either attempt would fail.
  await get('btn-download-svg').listeners.click()
  await get('btn-download-png').listeners.click()
})

test('own content replaces the example and clearing text or Wi-Fi restores it', () => {
  const { app, get, flush } = setup()
  for (const contentMode of ['text', 'wifi']) {
    app.update({ contentMode })
    get('primary-input').value = 'Mein Inhalt'
    get('primary-input').dispatchEvent({ type: 'input' })
    flush()
    assert.equal(app.hasCode(), true)
    assert.equal(get('download-buttons').classList.contains('hidden'), false)
    assert.doesNotMatch(get('qr-status').textContent, /Beispielvorschau/)
    get('primary-input').value = ''
    get('primary-input').dispatchEvent({ type: 'input' })
    assert.equal(app.hasCode(), false)
    flush()
    assert.match(get('qr-preview').innerHTML, /^<svg/)
    assert.match(get('qr-status').textContent, /Beispielvorschau/)
    assert.equal(get('download-buttons').classList.contains('hidden'), true)
  }
})

test('URL parameters immediately render the supplied content instead of the example', () => {
  const { app, get } = setup('?url=https%3A%2F%2Fexample.com%2F')
  assert.equal(get('primary-input').value, 'https://example.com/')
  assert.equal(app.hasCode(), true)
  assert.doesNotMatch(get('qr-status').textContent, /Beispielvorschau/)
})

test('editor applies every ECC level, fixed version, mask and encoding to the rendered QR', () => {
  const { app, get } = setup()
  app.update({ data: 'Grüße äöü', version: 5, mask: 7, encoding: 'iso-8859-1' })
  for (const level of ['L', 'M', 'Q', 'H']) {
    const control = get('error-correction')
    control.value = level
    control.dispatchEvent({ type: 'change' })
    assert.match(get('qr-status').textContent, new RegExp(`Version 5.*Fehlerkorrektur ${level}`))
    const expected = new QrSvgRenderer(new QrCore('Grüße äöü', {
      errorCorrectionLevel: level, minVersion: 5, maxVersion: 5, mask: 7, encoding: 'iso-8859-1',
    }).generate(), { size: 300, ...app.state.options }).render()
    const normalize = (svg) => svg.replace(/qr-gradient-[a-z0-9]+/g, 'gradient')
    assert.equal(normalize(app.state.currentSvg), normalize(expected))
  }
})

test('logo visibly enforces H and removing it restores the chosen ECC level', () => {
  const { app, get } = setup()
  app.update({ data: 'Logo', errorCorrectionLevel: 'L', logo: 'data:image/png;base64,AA==' })
  assert.equal(get('error-correction').value, 'H')
  assert.equal(get('error-correction').disabled, true)
  assert.match(get('qr-status').textContent, /Fehlerkorrektur H \(Logo\)/)
  get('btn-clear-logo').dispatchEvent({ type: 'click' })
  assert.equal(get('error-correction').value, 'L')
  assert.equal(get('error-correction').disabled, false)
  assert.match(get('qr-status').textContent, /Fehlerkorrektur L/)
})

test('invalid settings clear stale export state and recover after correction', () => {
  const { app, get } = setup()
  app.update({ data: 'Grüße 🌍 '.repeat(8) })
  assert.equal(app.hasCode(), true)
  app.update({ version: 1 })
  assert.equal(app.hasCode(), false)
  assert.equal(get('download-buttons').classList.contains('hidden'), true)
  assert.match(get('qr-status').textContent, /passt nicht/)
  app.update({ version: 0, encoding: 'iso-8859-1' })
  assert.equal(app.hasCode(), false)
  assert.match(get('qr-status').textContent, /UTF-8/)
  app.update({ encoding: 'utf-8' })
  assert.equal(app.hasCode(), true)
  assert.equal(get('download-buttons').classList.contains('hidden'), false)
  app.update({ data: '' })
  assert.equal(app.hasCode(), false)
  assert.equal(get('download-buttons').classList.contains('hidden'), true)
})

test('changing a setting before the debounce completes preserves fresh input and whitespace', () => {
  const { app, get, flush } = setup()
  get('primary-input').value = '  ä ö ü  '
  get('primary-input').dispatchEvent({ type: 'input' })
  get('error-correction').value = 'M'
  get('error-correction').dispatchEvent({ type: 'change' })
  flush()
  assert.equal(app.state.data, '  ä ö ü  ')
  assert.equal(get('primary-input').value, '  ä ö ü  ')
  assert.equal(app.hasCode(), true)
  assert.match(get('qr-status').textContent, /Fehlerkorrektur M/)
})
