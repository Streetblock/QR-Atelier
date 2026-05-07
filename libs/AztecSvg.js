// ==========================================
// AztecSvg.js - SVG renderer for Aztec matrix
// ==========================================

export class AztecSvgRenderer {
  static DEFAULT_STYLE = {
    size: 300,
    margin: 3,
    background: '#ffffff',
    colorStart: '#111827',
    colorEnd: '#2563eb',
  }

  constructor(aztecDataResult, options = {}) {
    if (!aztecDataResult || !aztecDataResult.modules) {
      throw new Error('Valid Aztec data result from AztecCore is required.')
    }
    this.aztec = aztecDataResult
    this.style = { ...AztecSvgRenderer.DEFAULT_STYLE, ...options }
  }

  render() {
    const modules = this.aztec.modules
    const count = this.aztec.size
    const viewBoxSize = count + this.style.margin * 2
    const gradientId = `aztec-gradient-${Math.random().toString(36).slice(2, 10)}`

    let moduleMarkup = ''
    for (let y = 0; y < count; y += 1) {
      for (let x = 0; x < count; x += 1) {
        if (!modules[y][x]) continue
        moduleMarkup += `<rect x="${x + this.style.margin}" y="${y + this.style.margin}" width="1" height="1"/>`
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.style.size}" height="${this.style.size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" fill="none" role="img" aria-label="Aztec code">`,
      `<defs>`,
      `<linearGradient id="${gradientId}" x1="0" y1="0" x2="${viewBoxSize}" y2="${viewBoxSize}" gradientUnits="userSpaceOnUse">`,
      `<stop offset="0%" stop-color="${this.style.colorStart}"/>`,
      `<stop offset="100%" stop-color="${this.style.colorEnd}"/>`,
      `</linearGradient>`,
      `</defs>`,
      `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${this.style.background}" rx="2.4"/>`,
      `<g fill="url(#${gradientId})">${moduleMarkup}</g>`,
      `</svg>`,
    ].join('')
  }
}

