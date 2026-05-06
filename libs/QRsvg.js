// ==========================================
// QrSvg.js - SVG Renderer für die QR-Matrix
// ==========================================

export class QrSvgRenderer {
  // Statische Defaults, falls der Nutzer keine Optionen übergibt
  static DEFAULT_STYLE = {
    size: 300,
    margin: 4,
    background: '#ffffff',
    colorStart: '#111827',
    colorEnd: '#2563eb',
    dotStyle: 'rounded',
    cornerStyle: 'extra-rounded',
    logo: null,
    logoScale: 0.22,
  }

  /**
   * @param {Object} qrDataResult Das zurückgegebene Objekt aus QrCore.generate()
   * @param {Object} options Visuelle Styling-Optionen
   */
  constructor(qrDataResult, options = {}) {
    if (!qrDataResult || !qrDataResult.modules) {
      throw new Error('Valid QR Code data result from QrCore is required.')
    }
    this.qrCode = qrDataResult
    this.style = { ...QrSvgRenderer.DEFAULT_STYLE, ...options }
  }

  /**
   * Rendert die QR-Matrix als SVG-String.
   * @returns {string} Fertiger SVG-Code
   */
  render() {
    const modules = this.qrCode.modules
    const count = this.qrCode.size
    const viewBoxSize = count + this.style.margin * 2
    const finderColor = getDarkerColor(this.style.colorStart, this.style.colorEnd)
    
    // Generiere eine zufällige ID für den Gradienten, um Konflikte 
    // bei mehreren QR-Codes auf derselben Seite zu vermeiden.
    const gradientId = `qr-gradient-${Math.random().toString(36).slice(2, 10)}`
    
    const finderAreas = getFinderAreas(count)
    const logoArea = getLogoArea(count, this.style.logo, this.style.logoScale)

    // 1. Rendere alle Datenpunkte (Dots)
    let bodyMarkup = ''
    for (let y = 0; y < count; y += 1) {
      for (let x = 0; x < count; x += 1) {
        // Überspringe leere Module, Finder-Muster und die Logo-Zone
        if (!modules[y][x] || isFinderCell(x, y, finderAreas) || isInsideArea(x, y, logoArea)) {
          continue
        }
        bodyMarkup += renderDot(x + this.style.margin, y + this.style.margin, modules, this.style.dotStyle, this.style.margin)
      }
    }

    // 2. Rendere die drei großen Finder-Muster an den Ecken
    let cornerMarkup = ''
    for (const area of finderAreas) {
      cornerMarkup += renderFinder(area.x + this.style.margin, area.y + this.style.margin, this.style.cornerStyle)
    }

    // 3. Rendere das Logo im Zentrum (falls konfiguriert)
    let logoMarkup = ''
    if (logoArea && this.style.logo) {
      const x = logoArea.x + this.style.margin
      const y = logoArea.y + this.style.margin
      const width = logoArea.size
      logoMarkup = [
        `<rect x="${x}" y="${y}" width="${width}" height="${width}" rx="1.1" fill="#ffffff"/>`,
        `<image href="${escapeAttribute(this.style.logo)}" x="${x + 0.7}" y="${y + 0.7}" width="${width - 1.4}" height="${width - 1.4}" preserveAspectRatio="xMidYMid meet"/>`,
      ].join('')
    }

    // 4. Füge alles in einem SVG-Tag zusammen
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.style.size}" height="${this.style.size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" fill="none" role="img" aria-label="QR code">`,
      `<defs>`,
      `<linearGradient id="${gradientId}" x1="0" y1="0" x2="${viewBoxSize}" y2="${viewBoxSize}" gradientUnits="userSpaceOnUse">`,
      `<stop offset="0%" stop-color="${this.style.colorStart}"/>`,
      `<stop offset="100%" stop-color="${this.style.colorEnd}"/>`,
      `</linearGradient>`,
      `</defs>`,
      `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${this.style.background}" rx="2.4"/>`,
      `<g fill="url(#${gradientId})">${bodyMarkup}</g>`,
      `<g fill="${finderColor}">${cornerMarkup}</g>`,
      logoMarkup,
      '</svg>',
    ].join('')
  }
}

// ==========================================
// Modul-Scope Helfer-Funktionen (Reine Logik, gekapselt)
// ==========================================

function renderDot(x, y, modules, dotStyle, margin) {
  const moduleX = x - margin
  const moduleY = y - margin
  const top = moduleY > 0 && modules[moduleY - 1][moduleX]
  const right = moduleX < modules.length - 1 && modules[moduleY][moduleX + 1]
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

function renderFinder(x, y, cornerStyle) {
  switch (cornerStyle) {
    case 'square':
      return [
        `<rect x="${x}" y="${y}" width="7" height="7"/>`,
        `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#ffffff"/>`,
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`,
      ].join('')
    case 'dot':
      return [
        `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3.5"/>`,
        `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="2.3" fill="#ffffff"/>`,
        `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.2"/>`,
      ].join('')
    case 'extra-rounded':
    default:
      return [
        roundedRectPath(x, y, 7, 7, 1.5, 1.5, 1.5, 1.5),
        `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.2" fill="#ffffff"/>`,
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`,
      ].join('')
  }
}

function getFinderAreas(count) {
  return [
    { x: 0, y: 0, size: 7 }, // Oben Links
    { x: count - 7, y: 0, size: 7 }, // Oben Rechts
    { x: 0, y: count - 7, size: 7 }, // Unten Links
  ]
}

function getLogoArea(count, logo, logoScale) {
  if (!logo) {
    return null
  }
  const desiredSize = Math.max(5, Math.floor(count * logoScale))
  const size = desiredSize % 2 === 0 ? desiredSize + 1 : desiredSize
  const x = Math.floor((count - size) / 2)
  const y = Math.floor((count - size) / 2)
  return { x, y, size }
}

function isFinderCell(x, y, finderAreas) {
  return finderAreas.some((area) => isInsideArea(x, y, area))
}

function isInsideArea(x, y, area) {
  return !!area && x >= area.x && x < area.x + area.size && y >= area.y && y < area.y + area.size
}

function roundedRectPath(x, y, width, height, tl, tr, br, bl) {
  return `<path d="M ${x + tl} ${y} H ${x + width - tr} Q ${x + width} ${y} ${x + width} ${y + tr} V ${y + height - br} Q ${x + width} ${y + height} ${x + width - br} ${y + height} H ${x + bl} Q ${x} ${y + height} ${x} ${y + height - bl} V ${y + tl} Q ${x} ${y} ${x + tl} ${y} Z"/>`
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, '&quot;')
}

function getDarkerColor(firstColor, secondColor) {
  const firstLuminance = getRelativeLuminance(firstColor)
  const secondLuminance = getRelativeLuminance(secondColor)

  if (firstLuminance == null) {
    return secondColor
  }
  if (secondLuminance == null) {
    return firstColor
  }
  return firstLuminance <= secondLuminance ? firstColor : secondColor
}

function getRelativeLuminance(color) {
  const channels = parseHexColor(color)
  if (!channels) {
    return null
  }

  const [red, green, blue] = channels.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function parseHexColor(color) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim())
  if (!match) {
    return null
  }

  const raw = match[1]
  const hex = raw.length === 3
    ? raw.split('').map((character) => character + character).join('')
    : raw

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}
