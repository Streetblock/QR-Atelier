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
    moduleStyle: 'square',
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
        moduleMarkup += renderModule(
          x + this.style.margin,
          y + this.style.margin,
          modules,
          x,
          y,
          this.style.moduleStyle
        )
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

function renderModule(x, y, modules, moduleX, moduleY, moduleStyle) {
  const top = moduleY > 0 && modules[moduleY - 1][moduleX]
  const right = moduleX < modules.length - 1 && modules[moduleY][moduleX + 1]
  const bottom = moduleY < modules.length - 1 && modules[moduleY + 1][moduleX]
  const left = moduleX > 0 && modules[moduleY][moduleX - 1]

  if (moduleStyle === 'dots') {
    const parts = [`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.36"/>`]
    if (top) parts.push(`<rect x="${x + 0.2}" y="${y}" width="0.6" height="0.5"/>`)
    if (right) parts.push(`<rect x="${x + 0.5}" y="${y + 0.2}" width="0.5" height="0.6"/>`)
    if (bottom) parts.push(`<rect x="${x + 0.2}" y="${y + 0.5}" width="0.6" height="0.5"/>`)
    if (left) parts.push(`<rect x="${x}" y="${y + 0.2}" width="0.5" height="0.6"/>`)
    return parts.join('')
  }
  if (moduleStyle === 'rounded') {
    return `<rect x="${x}" y="${y}" width="1" height="1" rx="0.26"/>`
  }
  if (moduleStyle === 'classy') {
    const parts = [
      `<path d="M ${x + 0.42} ${y} H ${x + 1} V ${y + 0.58} Q ${x + 1} ${y + 1} ${x + 0.58} ${y + 1} H ${x} V ${y + 0.42} Q ${x} ${y} ${x + 0.42} ${y} Z"/>`,
    ]
    if (top) parts.push(`<rect x="${x}" y="${y}" width="1" height="0.5"/>`)
    if (right) parts.push(`<rect x="${x + 0.5}" y="${y}" width="0.5" height="1"/>`)
    if (bottom) parts.push(`<rect x="${x}" y="${y + 0.5}" width="1" height="0.5"/>`)
    if (left) parts.push(`<rect x="${x}" y="${y}" width="0.5" height="1"/>`)
    return parts.join('')
  }
  return `<rect x="${x}" y="${y}" width="1" height="1"/>`
}
