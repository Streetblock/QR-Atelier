import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBarcodeMatrixPath, validateBarcodeMatrix } from '../libs/BarcodeMatrixSvg.js'
import { MicroPdf417Core, Pdf417Core } from '../libs/PDF417core.js'
import {
  MicroPDF417SvgRenderer,
  PDF417SvgRenderer,
  Pdf417SvgRenderer,
  buildPdf417Path,
} from '../libs/PDF417Svg.js'

test('renders standard PDF417 with a three-module row height and quiet zone', () => {
  const symbol = new Pdf417Core('PDF417 VECTOR', {
    columns: 3,
    errorCorrectionLevel: 2,
  }).generate()
  const svg = new PDF417SvgRenderer(symbol).render()
  const expectedWidth = symbol.columns + 4
  const expectedHeight = symbol.rows * 3 + 4

  assert.match(svg, new RegExp(`width="${expectedWidth}" height="${expectedHeight}"`))
  assert.match(svg, new RegExp(`viewBox="0 0 ${expectedWidth} ${expectedHeight}"`))
  assert.match(svg, /aria-label="PDF417 barcode"/)
  assert.match(svg, /shape-rendering="crispEdges"/)
})

test('renders MicroPDF417 with a two-module row height', () => {
  const symbol = new MicroPdf417Core('MICRO VECTOR', { variant: '3x8' }).generate()
  const svg = new MicroPDF417SvgRenderer(symbol).render()

  assert.equal(symbol.columns, 82)
  assert.match(svg, /width="86" height="20" viewBox="0 0 86 20"/)
  assert.match(svg, /aria-label="MicroPDF417 barcode"/)
})

test('uses the same renderer for PDF417 and MicroPDF417 aliases', () => {
  assert.equal(PDF417SvgRenderer, Pdf417SvgRenderer)
  assert.equal(MicroPDF417SvgRenderer, Pdf417SvgRenderer)
})

test('merges adjacent modules into exact horizontal vector runs', () => {
  const modules = [
    [true, true, false, true],
    [false, true, true, false],
  ]
  const expected = 'M2 2h4v6h-4zM8 2h2v6h-2zM4 8h4v6h-4z'
  const options = { moduleSize: 2, rowHeight: 3, margin: 1 }
  assert.equal(buildBarcodeMatrixPath(modules, options), expected)
  assert.equal(buildPdf417Path(modules, options), expected)
  assert.deepEqual(validateBarcodeMatrix(modules), { rows: 2, columns: 4 })
})

test('supports dimensions, row scaling, colors and transparent output', () => {
  const symbol = new Pdf417Core('CUSTOM VECTOR', { columns: 2 }).generate()
  const svg = new Pdf417SvgRenderer(symbol, {
    moduleSize: 2,
    rowHeight: 4,
    margin: 0,
    width: 600,
    height: 180,
    foreground: '#123456',
    background: null,
    ariaLabel: 'PDF417 & shipping <data>',
  }).render()

  assert.match(svg, /width="600" height="180"/)
  assert.match(svg, new RegExp(`viewBox="0 0 ${symbol.columns * 2} ${symbol.rows * 8}"`))
  assert.match(svg, /fill="#123456"/)
  assert.doesNotMatch(svg, /<rect/)
  assert.match(svg, /aria-label="PDF417 &amp; shipping &lt;data&gt;"/)
})

test('is deterministic and does not mutate the core matrix', () => {
  const symbol = new MicroPdf417Core('STABLE SVG', { variant: '2x11' }).generate()
  const before = symbol.modules.map((row) => [...row])
  const renderer = new Pdf417SvgRenderer(symbol)

  assert.equal(renderer.render(), renderer.render())
  assert.deepEqual(symbol.modules, before)
})

test('validates core results, matrices and renderer options', () => {
  assert.throws(() => new Pdf417SvgRenderer(null), /core result is required/)
  assert.throws(
    () => new Pdf417SvgRenderer({
      modules: [[true]], rows: 2, columns: 1,
      codewords: [], dataCodewords: [], errorCodewords: [],
    }),
    /dimensions/,
  )
  assert.throws(() => buildPdf417Path([[true], [false, true]]), /rectangular/)

  const symbol = new Pdf417Core('OPTIONS').generate()
  assert.throws(() => new Pdf417SvgRenderer(symbol, { moduleSize: 0 }), /moduleSize/)
  assert.throws(() => new Pdf417SvgRenderer(symbol, { rowHeight: 0 }), /rowHeight/)
  assert.throws(() => new Pdf417SvgRenderer(symbol, { margin: -1 }), /margin/)
  assert.throws(() => new Pdf417SvgRenderer(symbol, { foreground: '' }), /foreground/)
})
