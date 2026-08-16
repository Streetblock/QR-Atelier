import assert from 'node:assert/strict'
import test from 'node:test'
import { GridMatrixCore } from '../libs/GridMatrixCore.js'
import { GridMatrixSvgRenderer } from '../libs/GridMatrixSvg.js'

test('renders Grid Matrix modules as a standalone SVG', () => {
  const symbol = new GridMatrixCore('Grid Matrix').generate()
  const before = symbol.modules.map(row => [...row])
  const svg = new GridMatrixSvgRenderer(symbol).render()
  assert.match(svg, /^<svg /)
  assert.match(svg, new RegExp(`viewBox="0 0 ${symbol.width + 4} ${symbol.height + 4}"`))
  assert.match(svg, new RegExp(`aria-label="Grid Matrix version ${symbol.layers}"`))
  assert.match(svg, /<g fill="#111827">/)
  assert.deepEqual(symbol.modules, before)
})

test('supports rounded modules, custom quiet zone and safe colors', () => {
  const symbol = new GridMatrixCore('123').generate()
  const svg = new GridMatrixSvgRenderer(symbol, {
    size: 512,
    margin: 4,
    moduleStyle: 'rounded',
    foreground: 'red&blue',
  }).render()
  assert.match(svg, /width="512" height="512"/)
  assert.match(svg, /viewBox="0 0 26 26"/)
  assert.match(svg, /rx="\.18"/)
  assert.match(svg, /fill="red&amp;blue"/)
})

test('rejects invalid symbols and renderer options', () => {
  const symbol = new GridMatrixCore('A').generate()
  assert.throws(() => new GridMatrixSvgRenderer({}), /GridMatrixCore/)
  assert.throws(() => new GridMatrixSvgRenderer(symbol, { size: 0 }), /size/)
  assert.throws(() => new GridMatrixSvgRenderer(symbol, { margin: 1.5 }), /margin/)
  assert.throws(() => new GridMatrixSvgRenderer(symbol, { moduleStyle: 'circle' }), /moduleStyle/)
})
