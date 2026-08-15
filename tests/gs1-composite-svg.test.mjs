import assert from 'node:assert/strict'
import test from 'node:test'

import { Gs1CompositeCore } from '../libs/GS1CompositeCore.js'
import {
  GS1CompositeSvgRenderer,
  Gs1CompositeSvgRenderer,
  buildGs1CompositePath,
} from '../libs/GS1CompositeSvg.js'

test('renders CC-A and CC-B with the default two-module row height', () => {
  for (const version of ['a', 'b']) {
    const component = new Gs1CompositeCore('(01)09521234543213', { version }).generate()
    const svg = new Gs1CompositeSvgRenderer(component).render()

    assert.match(svg, new RegExp(`width="${component.columns}"`))
    assert.match(svg, new RegExp(`height="${component.rows * 2}"`))
    assert.match(svg, new RegExp(`viewBox="0 0 ${component.columns} ${component.rows * 2}"`))
    assert.match(svg, /shape-rendering="crispEdges"/)
    assert.match(svg, /<path d="M/)
  }
})

test('renders CC-C with the default three-module row height', () => {
  const component = new Gs1CompositeCore('(01)09521234543213', {
    version: 'c',
    columns: 4,
  }).generate()
  const svg = new GS1CompositeSvgRenderer(component).render()

  assert.equal(component.columns, 137)
  assert.equal(component.rows, 5)
  assert.match(svg, /width="137" height="15" viewBox="0 0 137 15"/)
})

test('merges adjacent dark modules into deterministic horizontal vector runs', () => {
  const modules = [
    [true, true, false, true],
    [false, true, true, false],
  ]
  assert.equal(
    buildGs1CompositePath(modules, { moduleSize: 2, rowHeight: 3, margin: 1 }),
    'M2 2h4v6h-4zM8 2h2v6h-2zM4 8h4v6h-4z',
  )
})

test('supports scalable dimensions, margins, colors and a transparent background', () => {
  const component = new Gs1CompositeCore('(21)A12345678', { version: 'a' }).generate()
  const svg = new Gs1CompositeSvgRenderer(component, {
    moduleSize: 2,
    rowHeight: 2.5,
    margin: 3,
    width: 550,
    height: 160,
    foreground: '#123456',
    background: null,
    ariaLabel: 'Lot & serial <component>',
  }).render()

  assert.match(svg, /width="550" height="160"/)
  assert.match(svg, /viewBox="0 0 122 37"/)
  assert.match(svg, /fill="#123456"/)
  assert.doesNotMatch(svg, /<rect/)
  assert.match(svg, /aria-label="Lot &amp; serial &lt;component&gt;"/)
})

test('does not mutate the core result and returns stable SVG', () => {
  const component = new Gs1CompositeCore('(99)1234-abcd', { version: 'b' }).generate()
  const before = component.modules.map((row) => [...row])
  const renderer = new Gs1CompositeSvgRenderer(component)
  assert.equal(renderer.render(), renderer.render())
  assert.deepEqual(component.modules, before)
})

test('rejects malformed results, matrices and visual options', () => {
  assert.throws(() => new Gs1CompositeSvgRenderer(null), /result is required/)
  assert.throws(
    () => new Gs1CompositeSvgRenderer({ modules: [[true]], rows: 2, columns: 1, version: 'CC-A' }),
    /dimensions/,
  )
  assert.throws(() => buildGs1CompositePath([[true], [false, true]]), /rectangular/)

  const component = new Gs1CompositeCore('(01)09521234543213', { version: 'a' }).generate()
  assert.throws(() => new Gs1CompositeSvgRenderer(component, { moduleSize: 0 }), /moduleSize/)
  assert.throws(() => new Gs1CompositeSvgRenderer(component, { margin: -1 }), /margin/)
  assert.throws(() => new Gs1CompositeSvgRenderer(component, { foreground: '' }), /foreground/)
})
