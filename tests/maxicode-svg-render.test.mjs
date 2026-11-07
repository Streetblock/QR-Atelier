import assert from 'node:assert/strict'
import test from 'node:test'
import { MaxiCodeCore, MAXICODE_BITNR, buildMaxiCodeLayout } from '../libs/MaxiCodeCore.js'
import { MaxiCodeSvgRenderer } from '../libs/MaxiCodeSvg.js'

const carrierData = '[)>\x1e01\x1d960123456789\x1dUPSN\x1d000001\x1d123\x1dDEMO\x1d1/1\x1d1\x1dN\x1dTEST\x1dBOSTON\x1dMA\x1e\x04'
const carrierOptions = { countryCode: '840', serviceClass: '001', preserveControls: true }
const cases = [
  [carrierData, { ...carrierOptions, mode: 2, postalCode: '100012696' }],
  [carrierData, { ...carrierOptions, mode: 3, postalCode: 'SW1A1A', countryCode: '826' }],
  ['GENERAL MODE FOUR 123', { mode: 4 }],
  ['ENHANCED MODE FIVE 123', { mode: 5 }],
  ['READER CONFIGURATION', { mode: 6 }],
]
const style = { size: 240, margin: 0 }

test('SVG renders every encoded dark MaxiCode data module in modes 2 through 6', () => {
  for (const [data, options] of cases) {
    const symbol = new MaxiCodeCore(data, options).generate()
    const svg = new MaxiCodeSvgRenderer(symbol, style).render()
    const darkModules = MAXICODE_BITNR.flatMap((row, y) => row.filter((bit, x) => bit >= 0 && symbol.modules[y][x])).length
    const dataPaths = svg.match(/<path\b[^>]*fill="url\(#maxicode-gradient-[^"]+\)"\/>/gu)
    assert.equal(dataPaths?.length, darkModules, `mode ${options.mode}`)
  }
})

test('the outer finder ring stays inside the space between MaxiCode data hexagons', () => {
  const symbol = new MaxiCodeCore('ABC', { mode: 4 }).generate()
  const svg = new MaxiCodeSvgRenderer(symbol, style).render()
  const outerRing = svg.match(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/u)
  assert.ok(outerRing)
  const [finderX, finderY, outerRadius] = outerRing.slice(1).map(Number)
  const layout = buildMaxiCodeLayout(style.size, style.margin, symbol.modules[0].length, symbol.modules.length)
  const nearestDataCenter = Math.min(...MAXICODE_BITNR.flatMap((row, y) => row.flatMap((bit, x) => {
    if (bit < 0) return []
    const cx = layout.offsetX + (x + 0.5 + (y & 1) * 0.5) * layout.pitchX
    const cy = layout.offsetY + layout.hexHeight / 2 + y * layout.pitchY
    return [Math.hypot(cx - finderX, cy - finderY)]
  })))
  assert.ok(outerRadius + layout.hexRadius < nearestDataCenter)
})
