export class GridMatrixSvgRenderer {
  static DEFAULT_STYLE = {
    size: 300,
    margin: 2,
    background: '#ffffff',
    foreground: '#111827',
    moduleStyle: 'square',
  }

  constructor(symbol, options = {}) {
    if (!symbol || symbol.format !== 'GridMatrix' || !Array.isArray(symbol.modules)) {
      throw new TypeError('A GridMatrixCore result is required.')
    }
    this.symbol = symbol
    this.style = { ...GridMatrixSvgRenderer.DEFAULT_STYLE, ...options }
    validateStyle(this.style)
  }

  render() {
    const { margin, background, foreground, moduleStyle, size } = this.style
    const viewSize = this.symbol.width + margin * 2
    let body = ''
    for (let y = 0; y < this.symbol.height; y++) {
      for (let x = 0; x < this.symbol.width; x++) {
        if (!this.symbol.modules[y][x]) continue
        body += moduleStyle === 'rounded'
          ? `<rect x="${x + margin}" y="${y + margin}" width="1" height="1" rx=".18"/>`
          : `<rect x="${x + margin}" y="${y + margin}" width="1" height="1"/>`
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewSize} ${viewSize}" role="img" aria-label="Grid Matrix version ${this.symbol.layers}"><rect width="${viewSize}" height="${viewSize}" fill="${escapeXml(background)}"/><g fill="${escapeXml(foreground)}">${body}</g></svg>`
  }
}

function validateStyle(style) {
  if (!Number.isFinite(style.size) || style.size <= 0) throw new RangeError('Grid Matrix SVG size must be positive.')
  if (!Number.isInteger(style.margin) || style.margin < 0) throw new RangeError('Grid Matrix SVG margin must be a non-negative integer.')
  if (!['square', 'rounded'].includes(style.moduleStyle)) throw new RangeError("Grid Matrix moduleStyle must be 'square' or 'rounded'.")
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
}
