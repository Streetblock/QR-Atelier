import assert from 'node:assert/strict'
import test from 'node:test'
import { Pdf417Core, MicroPdf417Core, MICRO_PDF417_VARIANTS } from '../libs/PDF417core.js'
import { Pdf417SvgRenderer, buildPdf417Path } from '../libs/PDF417Svg.js'
import { validateBarcodeMatrix } from '../libs/PDF417MatrixSvg.js'

const number = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?'
const rectangle = new RegExp(`M(${number}) (${number})h(${number})v(${number})h-(${number})z`, 'gy')
const approximately = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 1e-12, Number.MIN_VALUE), `${actual} != ${expected}`)

// Recover every source module from the emitted SVG geometry, independently of
// the forward run builder. This catches shifted, missing, duplicate and scaled ink.
function assertSvgMatrix(symbol, options = {}) {
  const before = JSON.stringify(symbol)
  const svg = new Pdf417SvgRenderer(symbol, options).render()
  const moduleSize = options.moduleSize ?? 1
  const rowHeight = options.rowHeight ?? (symbol.errorCorrectionLevel === undefined ? 2 : 3)
  const margin = (options.margin ?? 2) * moduleSize
  const viewBox = svg.match(/viewBox="0 0 ([^ ]+) ([^"]+)"/)
  assert.ok(viewBox)
  approximately(Number(viewBox[1]), symbol.columns * moduleSize + 2 * margin)
  approximately(Number(viewBox[2]), symbol.rows * rowHeight * moduleSize + 2 * margin)
  const path = svg.match(/<path d="([^"]*)"/)[1]
  const recovered = Array.from({ length: symbol.rows }, () => Array(symbol.columns).fill(false))
  let end = 0
  rectangle.lastIndex = 0
  for (;;) {
    const match = rectangle.exec(path)
    if (!match) break
    assert.equal(match.index, end)
    end = rectangle.lastIndex
    const [x, y, width, height, reverseWidth] = match.slice(1).map(Number)
    assert.ok([x, y, width, height, reverseWidth].every(Number.isFinite))
    assert.ok(width > 0 && height > 0)
    assert.equal(width, reverseWidth)
    const row = Math.round((y - margin) / (rowHeight * moduleSize))
    const column = Math.round((x - margin) / moduleSize)
    const count = Math.round(width / moduleSize)
    assert.ok(row >= 0 && row < symbol.rows)
    assert.ok(column >= 0 && count > 0 && column + count <= symbol.columns)
    approximately(x, margin + column * moduleSize)
    approximately(y, margin + row * rowHeight * moduleSize)
    approximately(width, count * moduleSize)
    approximately(height, rowHeight * moduleSize)
    for (let offset = 0; offset < count; offset += 1) {
      assert.equal(recovered[row][column + offset], false, 'SVG rectangles must not duplicate ink')
      recovered[row][column + offset] = true
    }
  }
  assert.equal(end, path.length, 'The whole SVG path must consist of expected closed rectangles')
  assert.deepEqual(recovered, symbol.modules)
  assert.equal(JSON.stringify(symbol), before, 'Rendering must not mutate any source metadata or modules')
  return svg
}

for (const variant of MICRO_PDF417_VARIANTS) {
  test(`SVG preserves every module of MicroPDF417 ${variant.id}`, () => {
    const symbol = new MicroPdf417Core('A', { variant: variant.id }).generate()
    assertSvgMatrix(symbol)
    assertSvgMatrix(symbol, { moduleSize: 3, rowHeight: 2, margin: 4, background: null })
  })
}

for (const truncated of [false, true]) {
  for (const errorCorrectionLevel of [0, 2, 8]) {
    test(`SVG preserves ${truncated ? 'truncated' : 'standard'} PDF417 at ECC ${errorCorrectionLevel}`, () => {
      const columns = errorCorrectionLevel === 8 ? 8 : 4
      const symbol = new Pdf417Core('PDF417 VECTOR 0123456789', { columns, errorCorrectionLevel, truncated }).generate()
      assertSvgMatrix(symbol)
      assertSvgMatrix(symbol, { moduleSize: 0.125, rowHeight: 4, margin: 0, width: 600, height: 180 })
    })
  }
}

test('SVG preserves positive geometry below six decimal places', () => {
  const symbol = new MicroPdf417Core('A', { variant: '2x11' }).generate()
  const svg = assertSvgMatrix(symbol, { moduleSize: 1e-7, margin: 1 })
  assert.doesNotMatch(svg, /(?:width|height)="0"/)
  assert.doesNotMatch(svg, /(?:h0v|v0h)/)
  assert.equal(buildPdf417Path([[true]], { moduleSize: 1e-7 }), 'M0 0h1e-7v1e-7h-1e-7z')
})

test('SVG rejects sparse and non-boolean matrices rather than silently replacing data', () => {
  const missing = [true, , false]
  const inherited = [true, , false]
  const prototype = Object.create(Array.prototype)
  prototype[1] = true
  Object.setPrototypeOf(inherited, prototype)
  for (const modules of [[missing], [inherited], [[true, 1]], [[true, null]], new Array(1), [[true], [false, true]]]) {
    assert.throws(() => validateBarcodeMatrix(modules), /boolean matrix/)
    assert.throws(() => buildPdf417Path(modules), /boolean matrix/)
  }
})

test('SVG rejects overflow and underflow in derived geometry even for a white matrix', () => {
  for (const options of [
    { moduleSize: Number.MAX_VALUE },
    { moduleSize: 2, rowHeight: Number.MAX_VALUE },
    { margin: Number.MAX_VALUE },
    { moduleSize: Number.MIN_VALUE, rowHeight: Number.MIN_VALUE },
    { moduleSize: Number.MIN_VALUE, margin: Number.MIN_VALUE },
    { margin: 1e100 },
  ]) {
    assert.throws(() => buildPdf417Path([[true, false]], options), /SVG/)
    assert.throws(() => buildPdf417Path([[false, false]], options), /SVG/)
    const symbol = new Pdf417Core('A').generate()
    assert.throws(() => new Pdf417SvgRenderer(symbol, options).render(), /SVG/)
  }
})

test('SVG escapes quotes and markup in all text attributes', () => {
  const symbol = new Pdf417Core('A').generate()
  const untrusted = 'x" onload="alert(1) & <script>bad</script>'
  const svg = new Pdf417SvgRenderer(symbol, { foreground: untrusted, background: untrusted, ariaLabel: untrusted }).render()
  assert.doesNotMatch(svg, /<script|" onload="/)
  assert.equal((svg.match(/&quot;/g) ?? []).length, 6)
  assert.equal((svg.match(/&amp;/g) ?? []).length, 3)
  assert.match(svg, /&lt;script&gt;bad&lt;\/script&gt;/)
})
