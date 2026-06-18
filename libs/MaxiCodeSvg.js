// ==========================================
// MaxiCodeSvg.js - SVG Renderer for MaxiCode
// ==========================================

import { MAXICODE_HEIGHT, MAXICODE_WIDTH, MAXICODE_BITNR, buildMaxiCodeLayout } from './MaxiCodeCore.js'

const FIXED_CELL_COLORS = {
  // MaxiCode uses negative bit markers for fixed template cells.
  // -1 renders as a white punch-out, -2 as a solid black marker.
  [-1]: '#ffffff',
  [-2]: '#111827',
}

export class MaxiCodeSvgRenderer {
  static DEFAULT_STYLE = {
    size: 620,
    margin: 4,
    background: '#ffffff',
    colorStart: '#111827',
    colorEnd: '#2563eb',
  }

  constructor(maxiCodeDataResult, options = {}) {
    if (!maxiCodeDataResult || !maxiCodeDataResult.modules) {
      throw new Error('Valid MaxiCode data result from MaxiCodeCore is required.')
    }
    this.maxiCode = maxiCodeDataResult
    this.style = { ...MaxiCodeSvgRenderer.DEFAULT_STYLE, ...options }
  }

  render() {
    const layout = buildMaxiCodeLayout(this.style.size, this.style.margin, MAXICODE_WIDTH, MAXICODE_HEIGHT)
    const { hexRadius, pitchX, pitchY, hexWidth, hexHeight, totalWidth, totalHeight, offsetX, offsetY, bullseyeCenterX, bullseyeCenterY, bullseyeOuterRadius, bullseyeClearRadius } = layout
    const gradientId = `maxicode-gradient-${Math.random().toString(36).slice(2, 10)}`

    let dataMarkup = ''
    let fixedMarkup = ''

    for (let y = 0; y < MAXICODE_HEIGHT; y += 1) {
      const rowShift = (y & 1) ? pitchX / 2 : 0
      for (let x = 0; x < MAXICODE_WIDTH; x += 1) {
        const bit = MAXICODE_BITNR[y][x]
        const cx = offsetX + hexWidth / 2 + x * pitchX + rowShift
        const cy = offsetY + hexHeight / 2 + y * pitchY
        const distanceToCenter = Math.hypot(cx - bullseyeCenterX, cy - bullseyeCenterY)

        if (distanceToCenter < bullseyeClearRadius) {
          continue
        }

        if (bit >= 0 && this.maxiCode.modules[y][x]) {
          dataMarkup += hexPath(cx, cy, hexRadius, `url(#${gradientId})`)
        } else if (bit in FIXED_CELL_COLORS) {
          fixedMarkup += hexPath(cx, cy, hexRadius, FIXED_CELL_COLORS[bit])
        }
      }
    }

    const bullseye = renderBullseye(bullseyeCenterX, bullseyeCenterY, bullseyeOuterRadius)

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.style.size}" height="${this.style.size}" viewBox="0 0 ${this.style.size} ${this.style.size}" role="img" aria-label="MaxiCode">`,
      `<defs>`,
      `<linearGradient id="${gradientId}" x1="${offsetX}" y1="${offsetY}" x2="${offsetX + totalWidth}" y2="${offsetY + totalHeight}" gradientUnits="userSpaceOnUse">`,
      `<stop offset="0%" stop-color="${this.style.colorStart}"/>`,
      `<stop offset="100%" stop-color="${this.style.colorEnd}"/>`,
      `</linearGradient>`,
      `</defs>`,
      `<rect width="100%" height="100%" fill="${this.style.background}"/>`,
      `<g>${dataMarkup}</g>`,
      `<g>${fixedMarkup}</g>`,
      bullseye,
      `</svg>`,
    ].join('')
  }

}

function hexPath(cx, cy, size, fill) {
  const w = size * 0.8660254037844386
  return `<path d="M ${cx} ${cy - size} L ${cx + w} ${cy - size * 0.5} L ${cx + w} ${cy + size * 0.5} L ${cx} ${cy + size} L ${cx - w} ${cy + size * 0.5} L ${cx - w} ${cy - size * 0.5} Z" fill="${fill}"/>`
}

function renderBullseye(cx, cy, outerRadius) {
  const rings = [
    { r: outerRadius, fill: '#111827' },
    { r: outerRadius * 0.82, fill: '#ffffff' },
    { r: outerRadius * 0.64, fill: '#111827' },
    { r: outerRadius * 0.46, fill: '#ffffff' },
    { r: outerRadius * 0.28, fill: '#111827' },
    { r: outerRadius * 0.10, fill: '#ffffff' },
  ]

  return `<g>${rings.map((ring) => `<circle cx="${cx}" cy="${cy}" r="${ring.r}" fill="${ring.fill}"/>`).join('')}</g>`
}
