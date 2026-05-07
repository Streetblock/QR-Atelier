import test from 'node:test'
import assert from 'node:assert/strict'
import { AztecCore } from '../libs/AztecCore.js'
import { AztecSvgRenderer } from '../libs/AztecSvg.js'

test('aztec svg renderer outputs svg with gradient and viewbox', () => {
  const aztec = new AztecCore('HELLO AZTEC').generate()
  const svg = new AztecSvgRenderer(aztec, { size: 256 }).render()
  assert.ok(svg.startsWith('<svg'))
  assert.match(svg, /linearGradient/)
  assert.match(svg, /viewBox="0 0 \d+ \d+"/)
})

test('aztec svg renderer supports rounded and dot styles', () => {
  const aztec = new AztecCore('HELLO AZTEC').generate()
  const rounded = new AztecSvgRenderer(aztec, { moduleStyle: 'rounded' }).render()
  const dots = new AztecSvgRenderer(aztec, { moduleStyle: 'dots' }).render()
  const classy = new AztecSvgRenderer(aztec, { moduleStyle: 'classy' }).render()
  assert.match(rounded, /rx="0\.26"/)
  assert.match(dots, /<circle /)
  assert.match(classy, /<path d="M /)
})
