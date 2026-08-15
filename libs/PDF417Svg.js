// Dependency-free SVG renderer shared by PDF417 and MicroPDF417 core results.

export class Pdf417SvgRenderer {
  static DEFAULT_STYLE = Object.freeze({
    moduleSize: 1,
    rowHeight: null,
    margin: 2,
    foreground: '#000000',
    background: '#ffffff',
    width: null,
    height: null,
    ariaLabel: null,
  })

  constructor(pdf417Result, options = {}) {
    const symbology = validatePdf417Result(pdf417Result)
    this.pdf417 = pdf417Result
    this.symbology = symbology
    this.style = normalizeStyle(
      { ...Pdf417SvgRenderer.DEFAULT_STYLE, ...options },
      symbology,
    )
  }

  render() {
    const { modules } = this.pdf417
    const {
      moduleSize,
      rowHeight,
      margin,
      foreground,
      background,
      ariaLabel,
    } = this.style
    const marginSize = margin * moduleSize
    const viewBoxWidth = modules[0].length * moduleSize + marginSize * 2
    const viewBoxHeight = modules.length * rowHeight * moduleSize + marginSize * 2
    const width = this.style.width ?? viewBoxWidth
    const height = this.style.height ?? viewBoxHeight
    const path = buildPdf417Path(modules, { moduleSize, rowHeight, margin })
    const backgroundMarkup = background === null
      ? ''
      : `<rect width="${formatNumber(viewBoxWidth)}" height="${formatNumber(viewBoxHeight)}" fill="${escapeXml(background)}"/>`

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(viewBoxWidth)} ${formatNumber(viewBoxHeight)}" role="img" aria-label="${escapeXml(ariaLabel)}" shape-rendering="crispEdges">`,
      backgroundMarkup,
      `<path d="${path}" fill="${escapeXml(foreground)}"/>`,
      '</svg>',
    ].join('')
  }
}

export const PDF417SvgRenderer = Pdf417SvgRenderer
export const MicroPdf417SvgRenderer = Pdf417SvgRenderer
export const MicroPDF417SvgRenderer = Pdf417SvgRenderer

export function buildPdf417Path(modules, options = {}) {
  validateModules(modules)
  const moduleSize = positiveNumber(options.moduleSize ?? 1, 'moduleSize')
  const rowHeight = positiveNumber(options.rowHeight ?? 1, 'rowHeight')
  const margin = nonNegativeNumber(options.margin ?? 0, 'margin')
  const marginSize = margin * moduleSize
  const commands = []

  for (let row = 0; row < modules.length; row += 1) {
    let column = 0
    while (column < modules[row].length) {
      if (!modules[row][column]) {
        column += 1
        continue
      }
      const start = column
      while (column < modules[row].length && modules[row][column]) column += 1
      const x = marginSize + start * moduleSize
      const y = marginSize + row * rowHeight * moduleSize
      const width = (column - start) * moduleSize
      const height = rowHeight * moduleSize
      commands.push(
        `M${formatNumber(x)} ${formatNumber(y)}h${formatNumber(width)}v${formatNumber(height)}h-${formatNumber(width)}z`,
      )
    }
  }
  return commands.join('')
}

function normalizeStyle(style, symbology) {
  const moduleSize = positiveNumber(style.moduleSize, 'moduleSize')
  const rowHeight = positiveNumber(
    style.rowHeight ?? (symbology === 'PDF417' ? 3 : 2),
    'rowHeight',
  )
  const margin = nonNegativeNumber(style.margin, 'margin')
  const width = optionalPositiveNumber(style.width, 'width')
  const height = optionalPositiveNumber(style.height, 'height')
  const foreground = normalizeColor(style.foreground, 'foreground')
  const background = style.background === null ? null : normalizeColor(style.background, 'background')
  const ariaLabel = String(style.ariaLabel ?? `${symbology} barcode`).trim()
  if (!ariaLabel) throw new Error('PDF417 SVG ariaLabel must not be empty.')
  return { moduleSize, rowHeight, margin, width, height, foreground, background, ariaLabel }
}

function validatePdf417Result(result) {
  if (!result || typeof result !== 'object') {
    throw new TypeError('A PDF417 or MicroPDF417 core result is required.')
  }
  validateModules(result.modules)
  if (result.rows !== result.modules.length || result.columns !== result.modules[0].length) {
    throw new Error('PDF417 result dimensions do not match its module matrix.')
  }
  if (!Array.isArray(result.codewords) || !Array.isArray(result.dataCodewords) || !Array.isArray(result.errorCodewords)) {
    throw new TypeError('A complete PDF417 or MicroPDF417 core result is required.')
  }
  return result.errorCorrectionLevel === undefined ? 'MicroPDF417' : 'PDF417'
}

function validateModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0 || !Array.isArray(modules[0]) || modules[0].length === 0) {
    throw new TypeError('PDF417 modules must be a non-empty boolean matrix.')
  }
  const columns = modules[0].length
  for (const row of modules) {
    if (!Array.isArray(row) || row.length !== columns || row.some((module) => typeof module !== 'boolean')) {
      throw new TypeError('PDF417 modules must be a rectangular boolean matrix.')
    }
  }
}

function positiveNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`PDF417 SVG ${name} must be a positive number.`)
  }
  return number
}

function nonNegativeNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`PDF417 SVG ${name} must be a non-negative number.`)
  }
  return number
}

function optionalPositiveNumber(value, name) {
  return value === null || value === undefined ? null : positiveNumber(value, name)
}

function normalizeColor(value, name) {
  const color = String(value ?? '').trim()
  if (!color) throw new Error(`PDF417 SVG ${name} must not be empty.`)
  return color
}

function formatNumber(value) {
  return String(Number(value.toFixed(6)))
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
