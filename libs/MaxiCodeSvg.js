// ==========================================
// MaxiCodeSvg.js - SVG Renderer for MaxiCode
// ==========================================

import { MAXICODE_HEIGHT, MAXICODE_WIDTH, MAXICODE_BITNR } from './MaxiCodeCore.js'

export class MaxiCodeSvgRenderer {
  static DEFAULT_STYLE = {
    size: 320,
    margin: 18,
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
    const scale = this.#getScale()
    const symbolWidth = 30.5
    const symbolHeight = 33
    const offsetX = (this.style.size - symbolWidth * scale) / 2
    const offsetY = (this.style.size - symbolHeight * scale) / 2
    const gradientId = `maxicode-gradient-${Math.random().toString(36).slice(2, 10)}`

    let dataMarkup = ''
    let fixedMarkup = ''

    for (let y = 0; y < MAXICODE_HEIGHT; y += 1) {
      for (let x = 0; x < MAXICODE_WIDTH; x += 1) {
        const bit = MAXICODE_BITNR[y][x]
        const cx = offsetX + (x + 0.5 + (y & 1) * 0.5) * scale
        const cy = offsetY + (y + 0.5) * scale

        if (bit >= 0 && this.maxiCode.modules[y][x]) {
          dataMarkup += hexPath(cx, cy, scale * 0.48, `url(#${gradientId})`)
        } else if (bit === -1 || bit === -2) {
          fixedMarkup += hexPath(cx, cy, scale * 0.48, '#111827')
        }
      }
    }

    const cx = offsetX + symbolWidth * scale / 2
    const cy = offsetY + symbolHeight * scale / 2
    const bullseye = renderBullseye(cx, cy, scale * 7.6)

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.style.size}" height="${this.style.size}" viewBox="0 0 ${this.style.size} ${this.style.size}" role="img" aria-label="MaxiCode">`,
      `<defs>`,
      `<linearGradient id="${gradientId}" x1="${offsetX}" y1="${offsetY}" x2="${offsetX + symbolWidth * scale}" y2="${offsetY + symbolHeight * scale}" gradientUnits="userSpaceOnUse">`,
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

  #getScale() {
    const usable = this.style.size - this.style.margin * 2
    return usable / 33
  }
}

function hexPath(cx, cy, size, fill) {
  const h = size * 0.8660254037844386
  return `<path d="M ${cx - size * 0.5} ${cy - h} L ${cx + size * 0.5} ${cy - h} L ${cx + size} ${cy} L ${cx + size * 0.5} ${cy + h} L ${cx - size * 0.5} ${cy + h} L ${cx - size} ${cy} Z" fill="${fill}"/>`
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
