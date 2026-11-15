import { BINARY_RS_FIELDS, encodeBinaryReedSolomon } from './internal/BinaryReedSolomon.js'
// ==========================================
// DMcore.js - Dependency-free Data Matrix ECC200 Generator
// ISO/IEC 16022 ECC 200 symbols with minimal high-level encoding
// ==========================================

import { encodeMinimalDataMatrix } from './DMminimal.js'

const DEFAULT_ENCODING = 'utf-8'
const ECI_ASSIGNMENT_UTF8 = 26
const MACRO_TRAILER = '\x1e\x04'
const MACRO_HEADERS = Object.freeze({
  5: '[)>\x1e05\x1d',
  6: '[)>\x1e06\x1d',
})
const MACRO_CODEWORDS = Object.freeze({ 5: 236, 6: 237 })

const DM_SYMBOLS = [
  { rows: 10, cols: 10, regionRows: 8, regionCols: 8, regionCountRows: 1, regionCountCols: 1, dataCodewords: 3, errorCodewords: 5, rsBlockData: 3, rsBlockError: 5 },
  { rows: 12, cols: 12, regionRows: 10, regionCols: 10, regionCountRows: 1, regionCountCols: 1, dataCodewords: 5, errorCodewords: 7, rsBlockData: 5, rsBlockError: 7 },
  { rows: 8, cols: 18, regionRows: 6, regionCols: 16, regionCountRows: 1, regionCountCols: 1, dataCodewords: 5, errorCodewords: 7, rsBlockData: 5, rsBlockError: 7, rectangular: true },
  { rows: 14, cols: 14, regionRows: 12, regionCols: 12, regionCountRows: 1, regionCountCols: 1, dataCodewords: 8, errorCodewords: 10, rsBlockData: 8, rsBlockError: 10 },
  { rows: 8, cols: 32, regionRows: 6, regionCols: 14, regionCountRows: 1, regionCountCols: 2, dataCodewords: 10, errorCodewords: 11, rsBlockData: 10, rsBlockError: 11, rectangular: true },
  { rows: 16, cols: 16, regionRows: 14, regionCols: 14, regionCountRows: 1, regionCountCols: 1, dataCodewords: 12, errorCodewords: 12, rsBlockData: 12, rsBlockError: 12 },
  { rows: 12, cols: 26, regionRows: 10, regionCols: 24, regionCountRows: 1, regionCountCols: 1, dataCodewords: 16, errorCodewords: 14, rsBlockData: 16, rsBlockError: 14, rectangular: true },
  { rows: 18, cols: 18, regionRows: 16, regionCols: 16, regionCountRows: 1, regionCountCols: 1, dataCodewords: 18, errorCodewords: 14, rsBlockData: 18, rsBlockError: 14 },
  { rows: 20, cols: 20, regionRows: 18, regionCols: 18, regionCountRows: 1, regionCountCols: 1, dataCodewords: 22, errorCodewords: 18, rsBlockData: 22, rsBlockError: 18 },
  { rows: 12, cols: 36, regionRows: 10, regionCols: 16, regionCountRows: 1, regionCountCols: 2, dataCodewords: 22, errorCodewords: 18, rsBlockData: 22, rsBlockError: 18, rectangular: true },
  { rows: 22, cols: 22, regionRows: 20, regionCols: 20, regionCountRows: 1, regionCountCols: 1, dataCodewords: 30, errorCodewords: 20, rsBlockData: 30, rsBlockError: 20 },
  { rows: 16, cols: 36, regionRows: 14, regionCols: 16, regionCountRows: 1, regionCountCols: 2, dataCodewords: 32, errorCodewords: 24, rsBlockData: 32, rsBlockError: 24, rectangular: true },
  { rows: 24, cols: 24, regionRows: 22, regionCols: 22, regionCountRows: 1, regionCountCols: 1, dataCodewords: 36, errorCodewords: 24, rsBlockData: 36, rsBlockError: 24 },
  { rows: 26, cols: 26, regionRows: 24, regionCols: 24, regionCountRows: 1, regionCountCols: 1, dataCodewords: 44, errorCodewords: 28, rsBlockData: 44, rsBlockError: 28 },
  { rows: 16, cols: 48, regionRows: 14, regionCols: 22, regionCountRows: 1, regionCountCols: 2, dataCodewords: 49, errorCodewords: 28, rsBlockData: 49, rsBlockError: 28, rectangular: true },
  { rows: 32, cols: 32, regionRows: 14, regionCols: 14, regionCountRows: 2, regionCountCols: 2, dataCodewords: 62, errorCodewords: 36, rsBlockData: 62, rsBlockError: 36 },
  { rows: 36, cols: 36, regionRows: 16, regionCols: 16, regionCountRows: 2, regionCountCols: 2, dataCodewords: 86, errorCodewords: 42, rsBlockData: 86, rsBlockError: 42 },
  { rows: 40, cols: 40, regionRows: 18, regionCols: 18, regionCountRows: 2, regionCountCols: 2, dataCodewords: 114, errorCodewords: 48, rsBlockData: 114, rsBlockError: 48 },
  { rows: 44, cols: 44, regionRows: 20, regionCols: 20, regionCountRows: 2, regionCountCols: 2, dataCodewords: 144, errorCodewords: 56, rsBlockData: 144, rsBlockError: 56 },
  { rows: 48, cols: 48, regionRows: 22, regionCols: 22, regionCountRows: 2, regionCountCols: 2, dataCodewords: 174, errorCodewords: 68, rsBlockData: 174, rsBlockError: 68 },
  { rows: 52, cols: 52, regionRows: 24, regionCols: 24, regionCountRows: 2, regionCountCols: 2, dataCodewords: 204, errorCodewords: 84, rsBlockData: 102, rsBlockError: 42 },
  { rows: 64, cols: 64, regionRows: 14, regionCols: 14, regionCountRows: 4, regionCountCols: 4, dataCodewords: 280, errorCodewords: 112, rsBlockData: 140, rsBlockError: 56 },
  { rows: 72, cols: 72, regionRows: 16, regionCols: 16, regionCountRows: 4, regionCountCols: 4, dataCodewords: 368, errorCodewords: 144, rsBlockData: 92, rsBlockError: 36 },
  { rows: 80, cols: 80, regionRows: 18, regionCols: 18, regionCountRows: 4, regionCountCols: 4, dataCodewords: 456, errorCodewords: 192, rsBlockData: 114, rsBlockError: 48 },
  { rows: 88, cols: 88, regionRows: 20, regionCols: 20, regionCountRows: 4, regionCountCols: 4, dataCodewords: 576, errorCodewords: 224, rsBlockData: 144, rsBlockError: 56 },
  { rows: 96, cols: 96, regionRows: 22, regionCols: 22, regionCountRows: 4, regionCountCols: 4, dataCodewords: 696, errorCodewords: 272, rsBlockData: 174, rsBlockError: 68 },
  { rows: 104, cols: 104, regionRows: 24, regionCols: 24, regionCountRows: 4, regionCountCols: 4, dataCodewords: 816, errorCodewords: 336, rsBlockData: 136, rsBlockError: 56 },
  { rows: 120, cols: 120, regionRows: 18, regionCols: 18, regionCountRows: 6, regionCountCols: 6, dataCodewords: 1050, errorCodewords: 408, rsBlockData: 175, rsBlockError: 68 },
  { rows: 132, cols: 132, regionRows: 20, regionCols: 20, regionCountRows: 6, regionCountCols: 6, dataCodewords: 1304, errorCodewords: 496, rsBlockData: 163, rsBlockError: 62 },
  { rows: 144, cols: 144, regionRows: 22, regionCols: 22, regionCountRows: 6, regionCountCols: 6, dataCodewords: 1558, errorCodewords: 620, rsBlockData: null, rsBlockError: 62, rsBlockDataLengths: [156, 156, 156, 156, 156, 156, 156, 156, 155, 155] },
  // Data Matrix Rectangular Extension sizes from ISO/IEC 21471:2025.
  { rows: 8, cols: 48, regionRows: 6, regionCols: 22, regionCountRows: 1, regionCountCols: 2, dataCodewords: 18, errorCodewords: 15, rsBlockData: 18, rsBlockError: 15, rectangular: true, dmre: true },
  { rows: 8, cols: 64, regionRows: 6, regionCols: 14, regionCountRows: 1, regionCountCols: 4, dataCodewords: 24, errorCodewords: 18, rsBlockData: 24, rsBlockError: 18, rectangular: true, dmre: true },
  { rows: 8, cols: 80, regionRows: 6, regionCols: 18, regionCountRows: 1, regionCountCols: 4, dataCodewords: 32, errorCodewords: 22, rsBlockData: 32, rsBlockError: 22, rectangular: true, dmre: true },
  { rows: 8, cols: 96, regionRows: 6, regionCols: 22, regionCountRows: 1, regionCountCols: 4, dataCodewords: 38, errorCodewords: 28, rsBlockData: 38, rsBlockError: 28, rectangular: true, dmre: true },
  { rows: 8, cols: 120, regionRows: 6, regionCols: 18, regionCountRows: 1, regionCountCols: 6, dataCodewords: 49, errorCodewords: 32, rsBlockData: 49, rsBlockError: 32, rectangular: true, dmre: true },
  { rows: 8, cols: 144, regionRows: 6, regionCols: 22, regionCountRows: 1, regionCountCols: 6, dataCodewords: 63, errorCodewords: 36, rsBlockData: 63, rsBlockError: 36, rectangular: true, dmre: true },
  { rows: 12, cols: 64, regionRows: 10, regionCols: 14, regionCountRows: 1, regionCountCols: 4, dataCodewords: 43, errorCodewords: 27, rsBlockData: 43, rsBlockError: 27, rectangular: true, dmre: true },
  { rows: 12, cols: 88, regionRows: 10, regionCols: 20, regionCountRows: 1, regionCountCols: 4, dataCodewords: 64, errorCodewords: 36, rsBlockData: 64, rsBlockError: 36, rectangular: true, dmre: true },
  { rows: 16, cols: 64, regionRows: 14, regionCols: 14, regionCountRows: 1, regionCountCols: 4, dataCodewords: 62, errorCodewords: 36, rsBlockData: 62, rsBlockError: 36, rectangular: true, dmre: true },
  { rows: 20, cols: 36, regionRows: 18, regionCols: 16, regionCountRows: 1, regionCountCols: 2, dataCodewords: 44, errorCodewords: 28, rsBlockData: 44, rsBlockError: 28, rectangular: true, dmre: true },
  { rows: 20, cols: 44, regionRows: 18, regionCols: 20, regionCountRows: 1, regionCountCols: 2, dataCodewords: 56, errorCodewords: 34, rsBlockData: 56, rsBlockError: 34, rectangular: true, dmre: true },
  { rows: 20, cols: 64, regionRows: 18, regionCols: 14, regionCountRows: 1, regionCountCols: 4, dataCodewords: 84, errorCodewords: 42, rsBlockData: 84, rsBlockError: 42, rectangular: true, dmre: true },
  { rows: 22, cols: 48, regionRows: 20, regionCols: 22, regionCountRows: 1, regionCountCols: 2, dataCodewords: 72, errorCodewords: 38, rsBlockData: 72, rsBlockError: 38, rectangular: true, dmre: true },
  { rows: 24, cols: 48, regionRows: 22, regionCols: 22, regionCountRows: 1, regionCountCols: 2, dataCodewords: 80, errorCodewords: 41, rsBlockData: 80, rsBlockError: 41, rectangular: true, dmre: true },
  { rows: 24, cols: 64, regionRows: 22, regionCols: 14, regionCountRows: 1, regionCountCols: 4, dataCodewords: 108, errorCodewords: 46, rsBlockData: 108, rsBlockError: 46, rectangular: true, dmre: true },
  { rows: 26, cols: 40, regionRows: 24, regionCols: 18, regionCountRows: 1, regionCountCols: 2, dataCodewords: 70, errorCodewords: 38, rsBlockData: 70, rsBlockError: 38, rectangular: true, dmre: true },
  { rows: 26, cols: 48, regionRows: 24, regionCols: 22, regionCountRows: 1, regionCountCols: 2, dataCodewords: 90, errorCodewords: 42, rsBlockData: 90, rsBlockError: 42, rectangular: true, dmre: true },
  { rows: 26, cols: 64, regionRows: 24, regionCols: 14, regionCountRows: 1, regionCountCols: 4, dataCodewords: 118, errorCodewords: 50, rsBlockData: 118, rsBlockError: 50, rectangular: true, dmre: true },
]

function publicSymbolSize(symbol) {
  return Object.freeze({
    rows: symbol.rows,
    cols: symbol.cols,
    rectangular: Boolean(symbol.rectangular),
    dmre: Boolean(symbol.dmre),
    dataCodewords: symbol.dataCodewords,
    errorCodewords: symbol.errorCodewords,
  })
}

export const DM_ECC200_SYMBOL_SIZES = Object.freeze(DM_SYMBOLS.filter((symbol) => !symbol.dmre).map(publicSymbolSize))
export const DMRE_SYMBOL_SIZES = Object.freeze(DM_SYMBOLS.filter((symbol) => symbol.dmre).map(publicSymbolSize))

export class DmCore {
  constructor(data, options = {}) {
    if (options.segments == null) {
      validateData(data)
    } else if (data !== null && data !== undefined && data !== '') {
      throw new Error('Data Matrix data must be null when segments are provided.')
    }

    this.data = data
    this.options = {
      shape: 'auto',
      encoding: DEFAULT_ENCODING,
      eci: 'auto',
      segments: null,
      dmre: false,
      gs1: false,
      macro: null,
      readerProgramming: false,
      structuredAppend: null,
      minSize: null,
      maxSize: null,
      symbolSize: null,
      ...options,
    }
  }

  generate() {
    const constraints = normalizeSymbolConstraints(this.options)
    const candidates = filterSymbols(constraints)
    const capacities = [...new Set(candidates.map((symbol) => symbol.dataCodewords))]
    if (capacities.length === 0) throw new Error('No Data Matrix symbols match the selected constraints.')
    const gs1 = normalizeGs1(this.options.gs1)
    const segmentedInput = normalizeSegments(this.options.segments)
    const macroInput = segmentedInput
      ? normalizeSegmentMacro(this.options.macro)
      : normalizeMacro(this.data, this.options.macro)
    const readerProgramming = normalizeReaderProgramming(this.options.readerProgramming)
    const structuredAppend = normalizeStructuredAppend(this.options.structuredAppend)
    if (gs1 && macroInput.macro !== null) throw new Error('Data Matrix Macro 05/06 cannot be combined with GS1 mode.')
    if (readerProgramming && (gs1 || macroInput.macro !== null)) {
      throw new Error('Data Matrix Reader Programming cannot be combined with GS1 or Macro 05/06.')
    }
    if (structuredAppend && macroInput.macro !== null) {
      throw new Error('Data Matrix Structured Append cannot be combined with Macro 05/06.')
    }
    if (structuredAppend && readerProgramming) {
      throw new Error('Data Matrix Structured Append cannot be combined with Reader Programming.')
    }
    const input = segmentedInput ?? encodeInputBytes(macroInput.payload, this.options.encoding, this.options.eci)
    if (segmentedInput && this.options.specialCodewords != null) {
      throw new Error('External Data Matrix codeword markers cannot be combined with segments.')
    }
    const specialCodewords = this.options.specialCodewords == null
      ? input.specialCodewords
      : normalizeSpecialCodewords(this.options.specialCodewords, input.bytes)
    const leadingGs1 = gs1 && (!structuredAppend || structuredAppend.metadata.position === 1)
    const prefixCodewords = [
      ...(structuredAppend?.codewords ?? []),
      ...(readerProgramming ? [234] : []),
      ...(macroInput.macro === null ? [] : [MACRO_CODEWORDS[macroInput.macro]]),
      ...(leadingGs1 ? [232] : []),
      ...input.eciCodewords,
    ]
    const encoded = encodeMinimalDataMatrix(input.bytes, capacities, prefixCodewords, {
      fnc1: gs1 ? 29 : null,
      modes: this.options.modes,
      specialCodewords,
    })
    const symbol = chooseSymbol(encoded.codewords.length, constraints)
    const dataCodewords = encoded.codewords
    const allCodewords = appendEcc200(dataCodewords, symbol)
    const modules = buildMatrix(allCodewords, symbol)

    return {
      data: this.data,
      format: 'datamatrix',
      encoding: input.encoding,
      gs1,
      macro: macroInput.macro,
      readerProgramming,
      structuredAppend: structuredAppend?.metadata ?? null,
      eciAssignmentNumber: input.eciAssignmentNumber,
      eciSegments: input.eciSegments ?? null,
      payloadBytes: input.payloadBytes ?? input.bytes,
      size: symbol.rows === symbol.cols ? symbol.rows : `${symbol.rows}x${symbol.cols}`,
      rows: symbol.rows,
      cols: symbol.cols,
      symbol,
      encodedCodewords: encoded.unpaddedLength,
      dataCodewords,
      errorCodewords: allCodewords.slice(symbol.dataCodewords),
      modules,
    }
  }
}

function normalizeSymbolConstraints(options) {
  const shape = String(options.shape ?? 'auto').toLowerCase()
  if (!['auto', 'square', 'rectangle', 'dmre'].includes(shape)) {
    throw new Error(`Unsupported Data Matrix shape: ${options.shape}`)
  }
  const minSize = parseDimensions(options.minSize, 'minSize')
  const maxSize = parseDimensions(options.maxSize, 'maxSize')
  const symbolSize = parseDimensions(options.symbolSize, 'symbolSize')
  const rows = normalizeOptionalDimension(options.rows, 'rows')
  const columns = normalizeOptionalDimension(options.columns, 'columns')
  if (minSize && maxSize && (minSize.rows > maxSize.rows || minSize.cols > maxSize.cols)) {
    throw new Error('minSize must fit within maxSize.')
  }
  if (symbolSize && !DM_SYMBOLS.some((symbol) => symbol.rows === symbolSize.rows && symbol.cols === symbolSize.cols)) {
    throw new Error(`Unsupported Data Matrix symbol size: ${symbolSize.rows}x${symbolSize.cols}`)
  }
  if (typeof options.dmre !== 'boolean') throw new Error('dmre must be a boolean.')
  return { shape, dmre: options.dmre, minSize, maxSize, symbolSize, rows, columns }
}

function normalizeOptionalDimension(value, name) {
  if (value == null || value === '' || Number(value) === 0) return null
  const dimension = Number(value)
  if (!Number.isSafeInteger(dimension) || dimension < 1) throw new Error(`${name} must be a positive integer or zero.`)
  return dimension
}

function normalizeSpecialCodewords(value, bytes) {
  if (!(value instanceof Map) && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new TypeError('Data Matrix codeword markers must be a map or record.')
  }
  const markers = new Map()
  for (const [key, words] of value instanceof Map ? value : Object.entries(value)) {
    const position = Number(key)
    if (!Number.isSafeInteger(position) || position < 0 || position >= bytes.length || markers.has(position)) {
      throw new RangeError('Data Matrix codeword marker must identify one distinct input byte.')
    }
    if (bytes[position] !== 0) throw new RangeError('Data Matrix codeword marker requires a zero-byte placeholder.')
    if (!Array.isArray(words) && !(words instanceof Uint8Array)) throw new TypeError('Data Matrix codewords must be a numeric array.')
    const codewords = Array.from(words)
    if (!codewords.length || codewords.some(word => !Number.isInteger(word) || word < 1 || word > 254)) {
      throw new RangeError('Data Matrix codewords must contain integers from 1 through 254.')
    }
    markers.set(position, codewords)
  }
  return markers
}

function normalizeGs1(value) {
  if (typeof value !== 'boolean') throw new Error('gs1 must be a boolean.')
  return value
}

function normalizeReaderProgramming(value) {
  if (typeof value !== 'boolean') throw new Error('readerProgramming must be a boolean.')
  return value
}

function normalizeStructuredAppend(value) {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('structuredAppend must be null or an object with position, total, and fileId.')
  }

  const { position, total, fileId } = value
  if (!Number.isInteger(total) || total < 2 || total > 16) {
    throw new Error('structuredAppend.total must be an integer from 2 to 16.')
  }
  if (!Number.isInteger(position) || position < 1 || position > total) {
    throw new Error('structuredAppend.position must be an integer from 1 through total.')
  }

  let fileIdCodewords
  let normalizedFileId
  if (Array.isArray(fileId)) {
    if (fileId.length !== 2 || fileId.some((part) => !Number.isInteger(part) || part < 1 || part > 254)) {
      throw new Error('structuredAppend.fileId codeword pair must contain two integers from 1 to 254.')
    }
    fileIdCodewords = [...fileId]
    normalizedFileId = (fileId[0] - 1) * 254 + fileId[1]
  } else {
    if (!Number.isInteger(fileId) || fileId < 1 || fileId > 64516) {
      throw new Error('structuredAppend.fileId must be an integer from 1 to 64516 or a two-codeword array.')
    }
    normalizedFileId = fileId
    fileIdCodewords = [Math.floor((fileId - 1) / 254) + 1, ((fileId - 1) % 254) + 1]
  }

  const sequenceIndicator = ((position - 1) << 4) | (17 - total)
  return {
    codewords: [233, sequenceIndicator, ...fileIdCodewords],
    metadata: Object.freeze({
      position,
      total,
      fileId: normalizedFileId,
      fileIdCodewords: Object.freeze(fileIdCodewords),
    }),
  }
}

function normalizeMacro(data, value) {
  if (value !== null && value !== 'auto' && value !== 5 && value !== 6) {
    throw new Error("macro must be null, 'auto', 5, or 6.")
  }

  const framedMacro = detectMacroFrame(data)
  if (value === null) return { macro: null, payload: data }
  if (value === 'auto' && framedMacro === null) return { macro: null, payload: data }
  if (value === 5 || value === 6) {
    if (framedMacro !== null && framedMacro.macro !== value) {
      throw new Error(`Input contains a Macro ${String(framedMacro.macro).padStart(2, '0')} frame but macro ${String(value).padStart(2, '0')} was requested.`)
    }
    const payload = framedMacro?.payload ?? data
    if (payload.length === 0) throw new Error('Data Matrix Macro payload must be non-empty.')
    return { macro: value, payload }
  }

  if (framedMacro.payload.length === 0) throw new Error('Data Matrix Macro payload must be non-empty.')
  return framedMacro
}

function detectMacroFrame(data) {
  if (typeof data !== 'string') return null
  for (const macro of [5, 6]) {
    const header = MACRO_HEADERS[macro]
    if (data.startsWith(header) && data.endsWith(MACRO_TRAILER)) {
      return { macro, payload: data.slice(header.length, -MACRO_TRAILER.length) }
    }
  }
  return null
}

function validateData(data) {
  if (typeof data === 'string') {
    if (data.length === 0) throw new Error('Data Matrix data must not be empty.')
    return
  }
  if (!Array.isArray(data) && !(data instanceof Uint8Array)) {
    throw new Error('Data Matrix data must be a non-empty string or byte array.')
  }
  if (data.length === 0) throw new Error('Data Matrix data must not be empty.')
  for (const value of data) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('Data Matrix byte values must be integers from 0 to 255.')
    }
  }
}

function normalizeSegmentMacro(value) {
  if (value === 'auto') throw new Error("macro: 'auto' is not available with Data Matrix segments.")
  if (value !== null && value !== 5 && value !== 6) throw new Error('macro must be null, 5, or 6 with Data Matrix segments.')
  return { macro: value, payload: null }
}

function encodeInputBytes(data, encoding, eci) {
  if (typeof data !== 'string') {
    const assignment = normalizeEci(eci, null)
    return {
      encoding: null,
      bytes: Array.from(data),
      eciAssignmentNumber: assignment,
      eciCodewords: encodeEciCodewords(assignment),
    }
  }

  const normalized = normalizeEncoding(encoding)
  if (normalized === 'utf-8') {
    const bytes = Array.from(new TextEncoder().encode(data))
    const needsEci = bytes.some((value) => value >= 128)
    const assignment = normalizeEci(eci, needsEci ? ECI_ASSIGNMENT_UTF8 : null)
    return {
      encoding: normalized,
      bytes,
      eciAssignmentNumber: assignment,
      eciCodewords: encodeEciCodewords(assignment),
    }
  }

  const bytes = Array.from(data, (character) => character.charCodeAt(0))
  if (bytes.some((value) => value > 255)) {
    throw new Error('Data contains characters that are not representable in ISO-8859-1.')
  }
  const assignment = normalizeEci(eci, null)
  return {
    encoding: normalized,
    bytes,
    eciAssignmentNumber: assignment,
    eciCodewords: encodeEciCodewords(assignment),
  }
}

function normalizeSegments(value) {
  if (value == null) return null
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('segments must be null or a non-empty array of Data Matrix segments.')
  }

  const bytes = []
  const payloadBytes = []
  const specialCodewords = new Map()
  const eciSegments = []
  for (let index = 0; index < value.length; index += 1) {
    const segment = value[index]
    if (typeof segment !== 'object' || segment === null || Array.isArray(segment) || !Object.hasOwn(segment, 'data')) {
      throw new Error('Each Data Matrix segment must be an object with a data property.')
    }
    validateData(segment.data)
    const segmentEci = Object.hasOwn(segment, 'eci') ? segment.eci : 'auto'
    const input = encodeInputBytes(segment.data, segment.encoding ?? DEFAULT_ENCODING, segmentEci)
    const byteOffset = payloadBytes.length
    if (input.eciCodewords.length > 0) {
      specialCodewords.set(bytes.length, input.eciCodewords)
      bytes.push(0)
    }
    bytes.push(...input.bytes)
    payloadBytes.push(...input.bytes)
    eciSegments.push(Object.freeze({
      index,
      byteOffset,
      byteLength: input.bytes.length,
      encoding: input.encoding,
      eciAssignmentNumber: input.eciAssignmentNumber,
    }))
  }

  return {
    encoding: null,
    bytes,
    payloadBytes,
    eciAssignmentNumber: null,
    eciCodewords: [],
    eciSegments: Object.freeze(eciSegments),
    specialCodewords,
  }
}

function normalizeEci(value, automaticAssignment) {
  if (value === 'auto' || value === undefined) return automaticAssignment
  if (value === null) return null
  if (!Number.isInteger(value) || value < 0 || value > 999999) {
    throw new Error("eci must be 'auto', null, or an integer from 0 to 999999.")
  }
  return value
}

function encodeEciCodewords(assignment) {
  if (assignment === null) return []
  if (assignment <= 126) return [241, assignment + 1]
  if (assignment <= 16382) {
    const adjusted = assignment - 127
    return [241, Math.floor(adjusted / 254) + 128, (adjusted % 254) + 1]
  }
  const adjusted = assignment - 16383
  return [
    241,
    Math.floor(adjusted / 64516) + 192,
    Math.floor((adjusted % 64516) / 254) + 1,
    (adjusted % 254) + 1,
  ]
}

function normalizeEncoding(encoding = DEFAULT_ENCODING) {
  const normalized = String(encoding ?? DEFAULT_ENCODING).toLowerCase().replaceAll('_', '-').replaceAll(' ', '')
  if (['utf8', 'utf-8'].includes(normalized)) return 'utf-8'
  if (['latin1', 'latin-1', 'iso-8859-1', 'iso8859-1', 'iso88591'].includes(normalized)) return 'iso-8859-1'
  throw new Error(`Unsupported Data Matrix encoding: ${encoding}`)
}

function parseDimensions(value, optionName) {
  if (value == null || value === '') return null
  if (Number.isInteger(Number(value)) && !String(value).includes('x')) {
    const size = Number(value)
    return { rows: size, cols: size }
  }
  const match = typeof value === 'string' ? /^(\d+)x(\d+)$/i.exec(value.trim()) : null
  const rows = match ? Number(match[1]) : Number(value?.rows)
  const cols = match ? Number(match[2]) : Number(value?.cols)
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error(`${optionName} must be an integer, "rowsxcols", or { rows, cols }.`)
  }
  return { rows, cols }
}

function chooseSymbol(codewordLength, constraints) {
  const symbol = filterSymbols(constraints).find((candidate) => codewordLength <= candidate.dataCodewords)

  if (!symbol) {
    throw new Error('Input does not fit the selected Data Matrix symbol constraints.')
  }

  return symbol
}

function filterSymbols(constraints) {
  return DM_SYMBOLS.filter((candidate) => {
    const exact = constraints.symbolSize
      && candidate.rows === constraints.symbolSize.rows
      && candidate.cols === constraints.symbolSize.cols
    if (candidate.dmre && constraints.shape !== 'dmre' && !constraints.dmre && !exact) return false
    if (!candidate.dmre && constraints.shape === 'dmre') return false
    if (constraints.shape === 'square' && candidate.rectangular) return false
    if (constraints.shape === 'rectangle' && !candidate.rectangular) return false
    if (constraints.symbolSize && (candidate.rows !== constraints.symbolSize.rows || candidate.cols !== constraints.symbolSize.cols)) return false
    if (constraints.rows && candidate.rows !== constraints.rows) return false
    if (constraints.columns && candidate.cols !== constraints.columns) return false
    return (
      (!constraints.minSize || (candidate.rows >= constraints.minSize.rows && candidate.cols >= constraints.minSize.cols)) &&
      (!constraints.maxSize || (candidate.rows <= constraints.maxSize.rows && candidate.cols <= constraints.maxSize.cols))
    )
  }).sort((left, right) => left.dataCodewords - right.dataCodewords)
}

function appendEcc200(dataCodewords, symbol) {
  const blockCount = symbol.rsBlockDataLengths?.length ?? symbol.dataCodewords / symbol.rsBlockData
  if (!Number.isInteger(blockCount) || blockCount < 1) {
    throw new Error('Invalid RS block configuration for Data Matrix symbol.')
  }

  const result = dataCodewords.slice()
  const totalLength = symbol.dataCodewords + symbol.errorCodewords
  while (result.length < totalLength) {
    result.push(0)
  }

  if (blockCount === 1) {
    const ecc = encodeBinaryReedSolomon(dataCodewords, symbol.rsBlockError, BINARY_RS_FIELDS.DATA_MATRIX)
    for (let i = 0; i < ecc.length; i += 1) {
      result[symbol.dataCodewords + i] = ecc[i]
    }
    return result
  }

  for (let block = 0; block < blockCount; block += 1) {
    const tempData = []
    for (let d = block; d < symbol.dataCodewords; d += blockCount) {
      tempData.push(dataCodewords[d])
    }
    const ecc = encodeBinaryReedSolomon(tempData, symbol.rsBlockError, BINARY_RS_FIELDS.DATA_MATRIX)
    const interleavedBlock = symbol.rsBlockDataLengths ? (block + 2) % blockCount : block
    let pos = 0
    for (let e = interleavedBlock; e < symbol.rsBlockError * blockCount; e += blockCount) {
      result[symbol.dataCodewords + e] = ecc[pos]
      pos += 1
    }
  }

  return result
}

function buildMatrix(codewords, symbol) {
  const dataRows = symbol.regionRows * symbol.regionCountRows
  const dataCols = symbol.regionCols * symbol.regionCountCols
  const placement = createSquareArray(dataRows, dataCols, -1)

  placeCodewords(placement, codewords)

  const modules = createSquareArray(symbol.rows, symbol.cols, false)
  let matrixY = 0

  for (let y = 0; y < dataRows; y += 1) {
    if (y % symbol.regionRows === 0) {
      for (let x = 0; x < symbol.cols; x += 1) {
        modules[matrixY][x] = x % 2 === 0
      }
      matrixY += 1
    }

    let matrixX = 0
    for (let x = 0; x < dataCols; x += 1) {
      if (x % symbol.regionCols === 0) {
        modules[matrixY][matrixX] = true
        matrixX += 1
      }

      modules[matrixY][matrixX] = placement[y][x] === 1
      matrixX += 1

      if (x % symbol.regionCols === symbol.regionCols - 1) {
        modules[matrixY][matrixX] = y % 2 === 0
        matrixX += 1
      }
    }

    matrixY += 1

    if (y % symbol.regionRows === symbol.regionRows - 1) {
      for (let x = 0; x < symbol.cols; x += 1) {
        modules[matrixY][x] = true
      }
      matrixY += 1
    }
  }

  return modules
}

function placeCodewords(placement, codewords) {
  const numRows = placement.length
  const numCols = placement[0].length

  let row = 4
  let col = 0
  let position = 0

  do {
    if (row === numRows && col === 0) {
      placeCorner1(placement, codewords, position)
      position += 1
    }
    if (row === numRows - 2 && col === 0 && numCols % 4 !== 0) {
      placeCorner2(placement, codewords, position)
      position += 1
    }
    if (row === numRows - 2 && col === 0 && numCols % 8 === 4) {
      placeCorner3(placement, codewords, position)
      position += 1
    }
    if (row === numRows + 4 && col === 2 && numCols % 8 === 0) {
      placeCorner4(placement, codewords, position)
      position += 1
    }

    do {
      if (row < numRows && col >= 0 && placement[row][col] < 0) {
        placeUtah(placement, codewords, row, col, position)
        position += 1
      }
      row -= 2
      col += 2
    } while (row >= 0 && col < numCols)

    row += 1
    col += 3

    do {
      if (row >= 0 && col < numCols && placement[row][col] < 0) {
        placeUtah(placement, codewords, row, col, position)
        position += 1
      }
      row += 2
      col -= 2
    } while (row < numRows && col >= 0)

    row += 3
    col += 1
  } while (row < numRows || col < numCols)

  if (placement[numRows - 1][numCols - 1] < 0) {
    placement[numRows - 1][numCols - 1] = 1
    placement[numRows - 2][numCols - 2] = 1
  }

  for (let y = 0; y < numRows; y += 1) {
    for (let x = 0; x < numCols; x += 1) {
      if (placement[y][x] < 0) {
        placement[y][x] = 0
      }
    }
  }
}

function placeUtah(placement, codewords, row, col, position) {
  placeBit(placement, codewords, row - 2, col - 2, position, 1)
  placeBit(placement, codewords, row - 2, col - 1, position, 2)
  placeBit(placement, codewords, row - 1, col - 2, position, 3)
  placeBit(placement, codewords, row - 1, col - 1, position, 4)
  placeBit(placement, codewords, row - 1, col, position, 5)
  placeBit(placement, codewords, row, col - 2, position, 6)
  placeBit(placement, codewords, row, col - 1, position, 7)
  placeBit(placement, codewords, row, col, position, 8)
}

function placeCorner1(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 1, 0, position, 1)
  placeBit(placement, codewords, numRows - 1, 1, position, 2)
  placeBit(placement, codewords, numRows - 1, 2, position, 3)
  placeBit(placement, codewords, 0, numCols - 2, position, 4)
  placeBit(placement, codewords, 0, numCols - 1, position, 5)
  placeBit(placement, codewords, 1, numCols - 1, position, 6)
  placeBit(placement, codewords, 2, numCols - 1, position, 7)
  placeBit(placement, codewords, 3, numCols - 1, position, 8)
}

function placeCorner2(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 3, 0, position, 1)
  placeBit(placement, codewords, numRows - 2, 0, position, 2)
  placeBit(placement, codewords, numRows - 1, 0, position, 3)
  placeBit(placement, codewords, 0, numCols - 4, position, 4)
  placeBit(placement, codewords, 0, numCols - 3, position, 5)
  placeBit(placement, codewords, 0, numCols - 2, position, 6)
  placeBit(placement, codewords, 0, numCols - 1, position, 7)
  placeBit(placement, codewords, 1, numCols - 1, position, 8)
}

function placeCorner3(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 3, 0, position, 1)
  placeBit(placement, codewords, numRows - 2, 0, position, 2)
  placeBit(placement, codewords, numRows - 1, 0, position, 3)
  placeBit(placement, codewords, 0, numCols - 2, position, 4)
  placeBit(placement, codewords, 0, numCols - 1, position, 5)
  placeBit(placement, codewords, 1, numCols - 1, position, 6)
  placeBit(placement, codewords, 2, numCols - 1, position, 7)
  placeBit(placement, codewords, 3, numCols - 1, position, 8)
}

function placeCorner4(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 1, 0, position, 1)
  placeBit(placement, codewords, numRows - 1, numCols - 1, position, 2)
  placeBit(placement, codewords, 0, numCols - 3, position, 3)
  placeBit(placement, codewords, 0, numCols - 2, position, 4)
  placeBit(placement, codewords, 0, numCols - 1, position, 5)
  placeBit(placement, codewords, 1, numCols - 3, position, 6)
  placeBit(placement, codewords, 1, numCols - 2, position, 7)
  placeBit(placement, codewords, 1, numCols - 1, position, 8)
}

function placeBit(placement, codewords, row, col, position, bit) {
  const numRows = placement.length
  const numCols = placement[0].length
  let wrappedRow = row
  let wrappedCol = col

  if (wrappedRow < 0) {
    wrappedRow += numRows
    wrappedCol += 4 - ((numRows + 4) % 8)
  }
  if (wrappedCol < 0) {
    wrappedCol += numCols
    wrappedRow += 4 - ((numCols + 4) % 8)
  }

  // Normalize after corner wrapping shifts. This keeps coordinates valid
  // even when the second correction step pushed row/col outside bounds.
  wrappedRow = ((wrappedRow % numRows) + numRows) % numRows
  wrappedCol = ((wrappedCol % numCols) + numCols) % numCols

  const codeword = codewords[position] ?? 0
  const value = ((codeword >> (8 - bit)) & 1) === 1 ? 1 : 0
  placement[wrappedRow][wrappedCol] = value
}

function createSquareArray(rows, cols, initialValue) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => initialValue))
}
