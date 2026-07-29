// ==========================================
// MicroQRsvg.js - SVG Renderer for Micro QR modules
// ==========================================

export class MicroQrSvgRenderer {
  static DEFAULT_STYLE = {
    size: 300,
    margin: 6,
    background: '#ffffff',
    colorStart: '#111827',
    colorEnd: '#2563eb',
    dotStyle: 'rounded',
  }

  constructor(microQrDataResult, options = {}) {
    if (!microQrDataResult || !microQrDataResult.modules) {
      throw new Error('Valid Micro QR result from MicroQrCore is required.')
    }
    this.microQrCode = microQrDataResult
    this.style = { ...MicroQrSvgRenderer.DEFAULT_STYLE, ...options }
  }

  render() {
    const modules = this.microQrCode.modules
    const size = this.microQrCode.size
    const viewBoxSize = size + this.style.margin * 2
    const gradientId = `microqr-gradient-${Math.random().toString(36).slice(2, 10)}`

    let bodyMarkup = ''
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!modules[y][x]) continue
        bodyMarkup += renderDot(x + this.style.margin, y + this.style.margin, modules, this.style.dotStyle, this.style.margin)
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.style.size}" height="${this.style.size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" fill="none" role="img" aria-label="Micro QR code">`,
      `<defs>`,
      `<linearGradient id="${gradientId}" x1="0" y1="0" x2="${viewBoxSize}" y2="${viewBoxSize}" gradientUnits="userSpaceOnUse">`,
      `<stop offset="0%" stop-color="${this.style.colorStart}"/>`,
      `<stop offset="100%" stop-color="${this.style.colorEnd}"/>`,
      `</linearGradient>`,
      `</defs>`,
      `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${this.style.background}" rx="2.2"/>`,
      `<g fill="url(#${gradientId})">${bodyMarkup}</g>`,
      `</svg>`,
    ].join('')
  }
}

function renderDot(x, y, modules, dotStyle, margin) {
  const moduleX = x - margin
  const moduleY = y - margin
  const top = moduleY > 0 && modules[moduleY - 1][moduleX]
  const right = moduleX < modules[0].length - 1 && modules[moduleY][moduleX + 1]
  const bottom = moduleY < modules.length - 1 && modules[moduleY + 1][moduleX]
  const left = moduleX > 0 && modules[moduleY][moduleX - 1]

  switch (dotStyle) {
    case 'dots':
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.34"/>`
    case 'diamond':
      return `<path d="M ${x + 0.5} ${y} L ${x + 1} ${y + 0.5} L ${x + 0.5} ${y + 1} L ${x} ${y + 0.5} Z"/>`
    case 'square':
      return `<rect x="${x}" y="${y}" width="1" height="1"/>`
    case 'classy':
      return renderClassyDot(x, y, top, right, bottom, left)
    case 'extra-rounded':
      return renderExtraRoundedDot(x, y, top, right, bottom, left)
    case 'classy-rounded':
      return renderClassyRoundedDot(x, y, top, right, bottom, left)
    case 'rounded':
    default: {
      const tl = top || left ? 0.12 : 0.38
      const tr = top || right ? 0.12 : 0.38
      const br = bottom || right ? 0.12 : 0.38
      const bl = bottom || left ? 0.12 : 0.38
      return roundedRectPath(x, y, 1, 1, tl, tr, br, bl)
    }
  }
}

function renderClassyDot(x, y, top, right, bottom, left) {
  const parts = [
    `<path d="M ${x + 0.42} ${y} H ${x + 1} V ${y + 0.58} Q ${x + 1} ${y + 1} ${x + 0.58} ${y + 1} H ${x} V ${y + 0.42} Q ${x} ${y} ${x + 0.42} ${y} Z"/>`,
  ]
  if (top) parts.push(`<rect x="${x}" y="${y}" width="1" height="0.5"/>`)
  if (right) parts.push(`<rect x="${x + 0.5}" y="${y}" width="0.5" height="1"/>`)
  if (bottom) parts.push(`<rect x="${x}" y="${y + 0.5}" width="1" height="0.5"/>`)
  if (left) parts.push(`<rect x="${x}" y="${y}" width="0.5" height="1"/>`)
  return parts.join('')
}

function renderExtraRoundedDot(x, y, top, right, bottom, left) {
  const tl = top || left ? 0.24 : 0.48
  const tr = top || right ? 0.24 : 0.48
  const br = bottom || right ? 0.24 : 0.48
  const bl = bottom || left ? 0.24 : 0.48
  return roundedRectPath(x, y, 1, 1, tl, tr, br, bl)
}

function renderClassyRoundedDot(x, y, top, right, bottom, left) {
  const parts = [
    `<path d="M ${x + 0.5} ${y} H ${x + 1} V ${y + 0.5} Q ${x + 1} ${y + 1} ${x + 0.5} ${y + 1} H ${x} V ${y + 0.5} Q ${x} ${y} ${x + 0.5} ${y} Z"/>`,
  ]
  if (top) parts.push(`<rect x="${x}" y="${y}" width="1" height="0.5"/>`)
  if (right) parts.push(`<rect x="${x + 0.5}" y="${y}" width="0.5" height="1"/>`)
  if (bottom) parts.push(`<rect x="${x}" y="${y + 0.5}" width="1" height="0.5"/>`)
  if (left) parts.push(`<rect x="${x}" y="${y}" width="0.5" height="1"/>`)
  return parts.join('')
}

function roundedRectPath(x, y, width, height, tl, tr, br, bl) {
  return `<path d="M ${x + tl} ${y} H ${x + width - tr} Q ${x + width} ${y} ${x + width} ${y + tr} V ${y + height - br} Q ${x + width} ${y + height} ${x + width - br} ${y + height} H ${x + bl} Q ${x} ${y + height} ${x} ${y + height - bl} V ${y + tl} Q ${x} ${y} ${x + tl} ${y} Z"/>`
}
