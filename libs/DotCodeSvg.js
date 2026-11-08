export class DotCodeSvgRenderer {
  static DEFAULT_STYLE = {
    moduleSize: 8,
    margin: 3,
    dotScale: 0.8,
    dotShape: 'circle',
  }

  constructor(symbol, options = {}) {
    if (!symbol || symbol.format !== 'DotCode' || !Array.isArray(symbol.modules)) {
      throw new TypeError('A DotCodeCore result is required.')
    }
    this.symbol = symbol
    this.style = { ...DotCodeSvgRenderer.DEFAULT_STYLE, ...options }
  }

  render() {
    const { moduleSize, margin, dotScale, dotShape } = this.style
    if (!Number.isFinite(moduleSize) || moduleSize <= 0 || !Number.isFinite(margin) ||
        margin < 0 || !Number.isFinite(dotScale) || dotScale <= 0 || dotScale > 1) {
      throw new RangeError('Invalid DotCode SVG dimensions.')
    }
    if (dotShape !== 'circle' && dotShape !== 'square') {
      throw new RangeError('DotCode dotShape must be circle or square.')
    }

    const { width, height, modules } = this.symbol
    const svgWidth = width + 2 * margin
    const svgHeight = height + 2 * margin
    const radius = dotScale / 2
    const origin = margin + (1 - dotScale) / 2
    const dots = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!modules[y][x]) continue
        dots.push(dotShape === 'square'
          ? `<rect x="${x + origin}" y="${y + origin}" width="${dotScale}" height="${dotScale}"/>`
          : `<circle cx="${x + margin + 0.5}" cy="${y + margin + 0.5}" r="${radius}"/>`)
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth * moduleSize}" height="${svgHeight * moduleSize}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="DotCode"><rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/><g fill="#000000">${dots.join('')}</g></svg>`
  }
}
