// ==========================================
// PDF417core.js - Dependency-free PDF417 and MicroPDF417 generators
// ==========================================

import { compactPdf417, normalizePdf417Bytes } from './PDF417Compaction.js'
import { generatePdf417ErrorCorrection } from './PDF417ErrorCorrection.js'
import { PDF417_CODEWORD_PATTERNS } from './PDF417Patterns.js'

export const PDF417_START_PATTERN = 0x1fea8
export const PDF417_STOP_PATTERN = 0x3fa29
export const PDF417_PAD_CODEWORD = 900

export const MICRO_PDF417_SIDE_RAPS = Object.freeze([
  802, 930, 946, 818, 882, 890, 826, 954, 922, 986, 970, 906, 778,
  794, 786, 914, 978, 982, 980, 916, 948, 932, 934, 942, 940, 936,
  808, 812, 814, 806, 822, 950, 918, 790, 788, 820, 884, 868, 870,
  878, 876, 872, 840, 856, 860, 862, 846, 844, 836, 838, 834, 866,
])

export const MICRO_PDF417_CENTER_RAPS = Object.freeze([
  718, 590, 622, 558, 550, 566, 534, 530, 538, 570, 562, 546, 610,
  626, 634, 762, 754, 758, 630, 628, 612, 614, 582, 578, 706, 738,
  742, 740, 748, 620, 556, 552, 616, 744, 712, 716, 708, 710, 646,
  654, 652, 668, 664, 696, 688, 656, 720, 592, 600, 604, 732, 734,
])

const MICRO_VARIANT_ROWS = [
  [1, 11, 7, 1, 0, 9],
  [1, 14, 7, 8, 0, 8],
  [1, 17, 7, 36, 0, 36],
  [1, 20, 8, 19, 0, 19],
  [1, 24, 8, 9, 0, 17],
  [1, 28, 8, 25, 0, 33],
  [2, 8, 8, 1, 0, 1],
  [2, 11, 9, 1, 0, 9],
  [2, 14, 9, 8, 0, 8],
  [2, 17, 10, 36, 0, 36],
  [2, 20, 11, 19, 0, 19],
  [2, 23, 13, 9, 0, 17],
  [2, 26, 15, 27, 0, 35],
  [3, 6, 12, 1, 1, 1],
  [3, 8, 14, 7, 7, 7],
  [3, 10, 16, 15, 15, 15],
  [3, 12, 18, 25, 25, 25],
  [3, 15, 21, 37, 37, 37],
  [3, 20, 26, 1, 17, 33],
  [3, 26, 32, 1, 9, 17],
  [3, 32, 38, 21, 29, 37],
  [3, 38, 44, 15, 31, 47],
  [3, 44, 50, 1, 25, 49],
  [4, 4, 8, 47, 19, 43],
  [4, 6, 12, 1, 1, 1],
  [4, 8, 14, 7, 7, 7],
  [4, 10, 16, 15, 15, 15],
  [4, 12, 18, 25, 25, 25],
  [4, 15, 21, 37, 37, 37],
  [4, 20, 26, 1, 17, 33],
  [4, 26, 32, 1, 9, 17],
  [4, 32, 38, 21, 29, 37],
  [4, 38, 44, 15, 31, 47],
  [4, 44, 50, 1, 25, 49],
]

export const MICRO_PDF417_VARIANTS = Object.freeze(MICRO_VARIANT_ROWS.map((entry) => {
  const [dataColumns, rows, errorCodewords, rapLeft, rapCenter, rapRight] = entry
  return Object.freeze({
    id: `${dataColumns}x${rows}`,
    dataColumns,
    rows,
    errorCodewords,
    dataCapacity: dataColumns * rows - errorCodewords,
    moduleColumns: [38, 55, 82, 99][dataColumns - 1],
    rowAddressStarts: Object.freeze({ left: rapLeft, center: rapCenter, right: rapRight }),
  })
}))

export class MicroPdf417Core {
  constructor(data, options = {}) {
    this.data = data
    this.options = {
      mode: 'auto',
      variant: null,
      rows: null,
      columns: null,
      ...options,
    }
  }

  generate() {
    const bytes = normalizePdf417Bytes(this.data)
    if (bytes.length === 0) throw new Error('MicroPDF417 data must not be empty.')

    const compactedCodewords = compactPdf417(bytes, {
      mode: this.options.mode,
      initialMode: 'byte',
    })
    const variant = selectMicroVariant(compactedCodewords.length, this.options)
    const dataCodewords = [
      ...compactedCodewords,
      ...new Array(variant.dataCapacity - compactedCodewords.length).fill(PDF417_PAD_CODEWORD),
    ]
    const errorCodewords = generatePdf417ErrorCorrection(dataCodewords, variant.errorCodewords)
    const codewords = [...dataCodewords, ...errorCodewords]
    const { modules, rowAddressPatterns } = buildMicroPdf417Matrix(codewords, variant)

    return {
      data: this.data,
      bytes,
      modules,
      rows: variant.rows,
      columns: variant.moduleColumns,
      dataColumns: variant.dataColumns,
      dataCodewords,
      errorCodewords,
      codewords,
      compactedCodewords,
      variant: variant.id,
      rowAddressPatterns,
    }
  }
}

export class Pdf417Core {
  constructor(data, options = {}) {
    this.data = data
    this.options = {
      mode: 'auto',
      errorCorrectionLevel: 2,
      columns: null,
      rows: null,
      truncated: false,
      ...options,
    }
  }

  generate() {
    const bytes = normalizePdf417Bytes(this.data)
    if (bytes.length === 0) throw new Error('PDF417 data must not be empty.')

    const compactedCodewords = compactPdf417(bytes, {
      mode: this.options.mode,
      initialMode: 'text',
    })
    const errorCorrectionLevel = normalizeErrorCorrectionLevel(this.options.errorCorrectionLevel)
    const errorCodewordCount = 2 ** (errorCorrectionLevel + 1)
    const dimensions = selectPdf417Dimensions(
      compactedCodewords.length + 1 + errorCodewordCount,
      this.options,
    )
    const totalCodewords = dimensions.dataColumns * dimensions.rows
    const dataCapacity = totalCodewords - errorCodewordCount
    const dataCodewords = [
      dataCapacity,
      ...compactedCodewords,
      ...new Array(dataCapacity - compactedCodewords.length - 1).fill(PDF417_PAD_CODEWORD),
    ]
    const errorCodewords = generatePdf417ErrorCorrection(dataCodewords, errorCodewordCount)
    const codewords = [...dataCodewords, ...errorCodewords]
    const truncated = Boolean(this.options.truncated)
    const modules = buildPdf417Matrix(
      codewords,
      dimensions.dataColumns,
      dimensions.rows,
      errorCorrectionLevel,
      truncated,
    )

    return {
      data: this.data,
      bytes,
      modules,
      rows: dimensions.rows,
      columns: modules[0].length,
      dataColumns: dimensions.dataColumns,
      dataCodewords,
      errorCodewords,
      codewords,
      compactedCodewords,
      errorCorrectionLevel,
      truncated,
      variant: `${dimensions.dataColumns}x${dimensions.rows}-ecl${errorCorrectionLevel}`,
    }
  }
}

export const MicroPDF417Core = MicroPdf417Core
export const PDF417Core = Pdf417Core

export function getPdf417CodewordPattern(codeword, cluster) {
  const normalizedCodeword = Number(codeword)
  const normalizedCluster = Number(cluster)
  if (!Number.isInteger(normalizedCodeword) || normalizedCodeword < 0 || normalizedCodeword > 928) {
    throw new Error('PDF417 codewords must be integers from 0 to 928.')
  }
  if (!Number.isInteger(normalizedCluster) || normalizedCluster < 0 || normalizedCluster > 2) {
    throw new Error('PDF417 clusters must be 0, 1, or 2.')
  }
  return PDF417_CODEWORD_PATTERNS[normalizedCluster][normalizedCodeword]
}

function selectMicroVariant(compactedLength, options) {
  const requestedVariant = normalizeVariantId(options.variant)
  const requestedRows = normalizeOptionalInteger(options.rows, 'MicroPDF417 rows')
  const requestedColumns = normalizeOptionalInteger(options.columns, 'MicroPDF417 columns')

  let candidates = MICRO_PDF417_VARIANTS
  if (requestedVariant !== null) {
    const exact = candidates.find((variant) => variant.id === requestedVariant)
    if (!exact) throw new Error(`Unsupported MicroPDF417 variant: ${options.variant}`)
    if (requestedRows !== null && requestedRows !== exact.rows) {
      throw new Error(`MicroPDF417 variant ${exact.id} conflicts with rows=${requestedRows}.`)
    }
    if (requestedColumns !== null && requestedColumns !== exact.dataColumns) {
      throw new Error(`MicroPDF417 variant ${exact.id} conflicts with columns=${requestedColumns}.`)
    }
    candidates = [exact]
  } else {
    if (requestedRows !== null) candidates = candidates.filter((variant) => variant.rows === requestedRows)
    if (requestedColumns !== null) candidates = candidates.filter((variant) => variant.dataColumns === requestedColumns)
    if (candidates.length === 0 && (requestedRows !== null || requestedColumns !== null)) {
      const requested = [
        requestedColumns === null ? null : `${requestedColumns} columns`,
        requestedRows === null ? null : `${requestedRows} rows`,
      ].filter(Boolean).join(' and ')
      throw new Error(`Unsupported MicroPDF417 size: ${requested}.`)
    }
  }

  const selected = candidates.find((variant) => compactedLength <= variant.dataCapacity)
  if (!selected) {
    const scope = requestedVariant ?? (
      requestedRows !== null || requestedColumns !== null ? 'the requested MicroPDF417 size' : 'MicroPDF417'
    )
    throw new Error(`Data requires ${compactedLength} codewords and exceeds ${scope} capacity.`)
  }
  return selected
}

function selectPdf417Dimensions(requiredCodewords, options) {
  const requestedColumns = normalizeOptionalInteger(options.columns, 'PDF417 columns')
  const requestedRows = normalizeOptionalInteger(options.rows, 'PDF417 rows')
  if (requestedColumns !== null && (requestedColumns < 1 || requestedColumns > 30)) {
    throw new Error('PDF417 data columns must be between 1 and 30.')
  }
  if (requestedRows !== null && (requestedRows < 3 || requestedRows > 90)) {
    throw new Error('PDF417 rows must be between 3 and 90.')
  }

  let dataColumns = requestedColumns
  let rows = requestedRows

  if (dataColumns !== null && rows !== null) {
    assertPdf417Capacity(dataColumns, rows, requiredCodewords)
    return { dataColumns, rows }
  }

  if (dataColumns !== null) {
    rows = Math.max(3, Math.ceil(requiredCodewords / dataColumns))
    if (rows > 90) throw new Error('Data exceeds the requested PDF417 column capacity.')
    assertPdf417Capacity(dataColumns, rows, requiredCodewords)
    return { dataColumns, rows }
  }

  if (rows !== null) {
    dataColumns = Math.max(1, Math.ceil(requiredCodewords / rows))
    if (dataColumns > 30) throw new Error('Data exceeds the requested PDF417 row capacity.')
    assertPdf417Capacity(dataColumns, rows, requiredCodewords)
    return { dataColumns, rows }
  }

  dataColumns = Math.max(1, Math.min(30, Math.round(Math.sqrt(requiredCodewords / 3))))
  rows = Math.max(3, Math.ceil(requiredCodewords / dataColumns))
  while ((rows > 90 || dataColumns * rows > 928) && dataColumns < 30) {
    dataColumns += 1
    rows = Math.max(3, Math.ceil(requiredCodewords / dataColumns))
  }
  assertPdf417Capacity(dataColumns, rows, requiredCodewords)
  return { dataColumns, rows }
}

function assertPdf417Capacity(dataColumns, rows, requiredCodewords) {
  const capacity = dataColumns * rows
  if (capacity > 928) throw new Error('PDF417 symbols may contain at most 928 codewords.')
  if (capacity < requiredCodewords) {
    throw new Error(`Data requires ${requiredCodewords} codewords but the PDF417 size holds ${capacity}.`)
  }
}

export function buildMicroPdf417Matrix(codewords, variant, options = {}) {
  const modules = []
  const rowAddressPatterns = []
  const { left, center, right } = variant.rowAddressStarts

  for (let rowIndex = 0; rowIndex < variant.rows; rowIndex += 1) {
    const cluster = (rowIndex + left - 1) % 3
    const leftIndex = (rowIndex + left - 1) % 52
    const centerIndex = (rowIndex + center - 1) % 52
    const rightIndex = (rowIndex + right - 1) % 52
    const row = []
    const rowCodewords = codewords.slice(
      rowIndex * variant.dataColumns,
      (rowIndex + 1) * variant.dataColumns,
    )

    if (!(options.omitLeftRapForThreeColumns && variant.dataColumns === 3)) {
      appendBits(row, MICRO_PDF417_SIDE_RAPS[leftIndex], 10)
    }
    if (variant.dataColumns <= 2) {
      for (const codeword of rowCodewords) appendCodeword(row, codeword, cluster)
    } else if (variant.dataColumns === 3) {
      appendCodeword(row, rowCodewords[0], cluster)
      appendBits(row, MICRO_PDF417_CENTER_RAPS[centerIndex], 10)
      appendCodeword(row, rowCodewords[1], cluster)
      appendCodeword(row, rowCodewords[2], cluster)
    } else {
      appendCodeword(row, rowCodewords[0], cluster)
      appendCodeword(row, rowCodewords[1], cluster)
      appendBits(row, MICRO_PDF417_CENTER_RAPS[centerIndex], 10)
      appendCodeword(row, rowCodewords[2], cluster)
      appendCodeword(row, rowCodewords[3], cluster)
    }
    appendBits(row, MICRO_PDF417_SIDE_RAPS[rightIndex], 10)
    row.push(true)

    modules.push(row)
    rowAddressPatterns.push(Object.freeze({
      cluster,
      left: leftIndex + 1,
      center: variant.dataColumns >= 3 ? centerIndex + 1 : null,
      right: rightIndex + 1,
    }))
  }

  return { modules, rowAddressPatterns: Object.freeze(rowAddressPatterns) }
}

export function buildPdf417Matrix(codewords, dataColumns, rows, errorCorrectionLevel, truncated = false) {
  const modules = []
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const cluster = rowIndex % 3
    const rowGroup = Math.floor(rowIndex / 3) * 30
    let leftIndicator
    let rightIndicator

    if (cluster === 0) {
      leftIndicator = rowGroup + Math.floor((rows - 1) / 3)
      rightIndicator = rowGroup + dataColumns - 1
    } else if (cluster === 1) {
      leftIndicator = rowGroup + errorCorrectionLevel * 3 + (rows - 1) % 3
      rightIndicator = rowGroup + Math.floor((rows - 1) / 3)
    } else {
      leftIndicator = rowGroup + dataColumns - 1
      rightIndicator = rowGroup + errorCorrectionLevel * 3 + (rows - 1) % 3
    }

    const row = []
    appendBits(row, PDF417_START_PATTERN, 17)
    appendCodeword(row, leftIndicator, cluster)
    for (let column = 0; column < dataColumns; column += 1) {
      appendCodeword(row, codewords[rowIndex * dataColumns + column], cluster)
    }
    if (truncated) {
      row.push(true)
    } else {
      appendCodeword(row, rightIndicator, cluster)
      appendBits(row, PDF417_STOP_PATTERN, 18)
    }
    modules.push(row)
  }
  return modules
}

function appendCodeword(row, codeword, cluster) {
  appendBits(row, PDF417_CODEWORD_PATTERNS[cluster][codeword], 17)
}

function appendBits(row, value, length) {
  for (let bit = length - 1; bit >= 0; bit -= 1) row.push(Boolean((value >>> bit) & 1))
}

function normalizeErrorCorrectionLevel(level) {
  const numeric = Number(level)
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 8) {
    throw new Error('PDF417 errorCorrectionLevel must be between 0 and 8.')
  }
  return numeric
}

function normalizeVariantId(variant) {
  if (variant === null || variant === undefined || variant === '') return null
  const match = String(variant).trim().toLowerCase().match(/^(\d+)\s*x\s*(\d+)$/)
  if (!match) throw new Error('MicroPDF417 variant must use the columnsxrows form, for example 2x11.')
  return `${Number(match[1])}x${Number(match[2])}`
}

function normalizeOptionalInteger(value, label) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isInteger(numeric)) throw new Error(`${label} must be an integer.`)
  return numeric
}
