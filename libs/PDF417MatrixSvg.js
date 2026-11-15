// Shared, symbology-neutral conversion of a boolean module matrix to SVG paths.

export function buildBarcodeMatrixPath(modules, options = {}) {
  validateBarcodeMatrix(modules)
  const moduleSize = positiveNumber(options.moduleSize ?? 1, 'moduleSize')
  const rowHeight = positiveNumber(options.rowHeight ?? 1, 'rowHeight')
  const margin = nonNegativeNumber(options.margin ?? 0, 'margin')
  const marginSize = margin * moduleSize
  if (!Number.isFinite(marginSize) || (margin > 0 && marginSize === 0)) {
    throw new Error('Barcode SVG scaled margin must be finite and preserve positive geometry.')
  }
  positiveNumber(rowHeight * moduleSize, 'scaled row height')
  positiveNumber(modules[0].length * moduleSize + marginSize * 2, 'viewBox width')
  positiveNumber(modules.length * rowHeight * moduleSize + marginSize * 2, 'viewBox height')
  const right = marginSize + modules[0].length * moduleSize
  const bottom = marginSize + modules.length * rowHeight * moduleSize
  if (!(right + moduleSize > right) || !(bottom + rowHeight * moduleSize > bottom)) {
    throw new Error('Barcode SVG module geometry exceeds numeric precision.')
  }
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
        `M${formatSvgNumber(x)} ${formatSvgNumber(y)}h${formatSvgNumber(width)}v${formatSvgNumber(height)}h-${formatSvgNumber(width)}z`,
      )
    }
  }
  return commands.join('')
}

export function validateBarcodeMatrix(modules) {
  if (!Array.isArray(modules) || modules.length === 0 || !Array.isArray(modules[0]) || modules[0].length === 0) {
    throw new TypeError('Barcode modules must be a non-empty boolean matrix.')
  }
  const columns = modules[0].length
  for (const row of modules) {
    if (!Array.isArray(row) || row.length !== columns) {
      throw new TypeError('Barcode modules must be a rectangular boolean matrix.')
    }
    for (let column = 0; column < columns; column += 1) {
      if (!Object.hasOwn(row, column) || typeof row[column] !== 'boolean') {
        throw new TypeError('Barcode modules must be a rectangular boolean matrix.')
      }
    }
  }
  return Object.freeze({ rows: modules.length, columns })
}

function positiveNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Barcode SVG ${name} must be a positive number.`)
  }
  return number
}

function nonNegativeNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`Barcode SVG ${name} must be a non-negative number.`)
  }
  return number
}

function formatSvgNumber(value) {
  return String(value)
}
