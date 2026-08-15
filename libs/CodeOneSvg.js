export class CodeOneSvgRenderer {
  static DEFAULT_STYLE = {
    size: 300,
    margin: 2,
    background: '#ffffff',
    foreground: '#111827',
    moduleStyle: 'square',
  }

  constructor(symbol, options = {}) {
    if (!symbol || symbol.format !== 'CodeOne' || !Array.isArray(symbol.modules)) {
      throw new TypeError('A CodeOneCore result is required.')
    }
    this.symbol = symbol
    this.style = { ...CodeOneSvgRenderer.DEFAULT_STYLE, ...options }
  }

  render() {
    const { margin, background, foreground, moduleStyle } = this.style
    const width = this.symbol.width + margin * 2
    const height = this.symbol.height + margin * 2
    let body = ''
    for (let y = 0; y < this.symbol.height; y++) {
      for (let x = 0; x < this.symbol.width; x++) {
        if (!this.symbol.modules[y][x]) continue
        body += moduleStyle === 'rounded'
          ? `<rect x="${x + margin}" y="${y + margin}" width="1" height="1" rx=".18"/>`
          : `<rect x="${x + margin}" y="${y + margin}" width="1" height="1"/>`
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.style.size}" height="${this.style.size * height / width}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Code One ${this.symbol.version}"><rect width="${width}" height="${height}" fill="${background}"/><g fill="${foreground}">${body}</g></svg>`
  }
}
