function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export class BarcodeMatrixSvgRenderer {
  constructor(result, options = {}) {
    if (!result?.modules?.length || !result.modules.every((row) => Array.isArray(row) && row.length === result.modules[0].length)) {
      throw new TypeError('A rectangular boolean module matrix is required');
    }
    this.result = result;
    this.options = {
      scale: 4,
      margin: 4,
      foreground: '#000000',
      background: '#ffffff',
      ariaLabel: '2D barcode',
      ...options,
    };
    if (!(this.options.scale > 0) || !(this.options.margin >= 0)) throw new RangeError('SVG scale must be positive and margin non-negative');
  }

  render() {
    const modules = this.result.modules;
    const rows = modules.length, columns = modules[0].length;
    const width = columns + this.options.margin * 2, height = rows + this.options.margin * 2;
    const paths = [];
    for (let y = 0; y < rows; y++) {
      let start = -1;
      for (let x = 0; x <= columns; x++) {
        if (x < columns && modules[y][x]) { if (start < 0) start = x; }
        else if (start >= 0) { paths.push(`M${start + this.options.margin} ${y + this.options.margin}h${x - start}v1H${start + this.options.margin}z`); start = -1; }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * this.options.scale}" height="${height * this.options.scale}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="${escapeAttribute(this.options.ariaLabel)}"><rect width="${width}" height="${height}" fill="${escapeAttribute(this.options.background)}"/><path d="${paths.join('')}" fill="${escapeAttribute(this.options.foreground)}"/></svg>`;
  }
}

export default BarcodeMatrixSvgRenderer;
