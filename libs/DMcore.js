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
]

export const DM_ECC200_SYMBOL_SIZES = Object.freeze(DM_SYMBOLS.map((symbol) => Object.freeze({
  rows: symbol.rows,
  cols: symbol.cols,
  rectangular: Boolean(symbol.rectangular),
  dataCodewords: symbol.dataCodewords,
  errorCodewords: symbol.errorCodewords,
})))

const DM_PRIMITIVE = 0x12d
const DM_FACTOR_SETS = [5, 7, 10, 11, 12, 14, 18, 20, 24, 28, 36, 42, 48, 56, 62, 68]
const DM_FACTORS = [
  [228, 48, 15, 111, 62],
  [23, 68, 144, 134, 240, 92, 254],
  [28, 24, 185, 166, 223, 248, 116, 255, 110, 61],
  [175, 138, 205, 12, 194, 168, 39, 245, 60, 97, 120],
  [41, 153, 158, 91, 61, 42, 142, 213, 97, 178, 100, 242],
  [156, 97, 192, 252, 95, 9, 157, 119, 138, 45, 18, 186, 83, 185],
  [83, 195, 100, 39, 188, 75, 66, 61, 241, 213, 109, 129, 94, 254, 225, 48, 90, 188],
  [15, 195, 244, 9, 233, 71, 168, 2, 188, 160, 153, 145, 253, 79, 108, 82, 27, 174, 186, 172],
  [52, 190, 88, 205, 109, 39, 176, 21, 155, 197, 251, 223, 155, 21, 5, 172, 254, 124, 12, 181, 184, 96, 50, 193],
  [211, 231, 43, 97, 71, 96, 103, 174, 37, 151, 170, 53, 75, 34, 249, 121, 17, 138, 110, 213, 141, 136, 120, 151, 233, 168, 93, 255],
  [245, 127, 242, 218, 130, 250, 162, 181, 102, 120, 84, 179, 220, 251, 80, 182, 229, 18, 2, 4, 68, 33, 101, 137, 95, 119, 115, 44, 175, 184, 59, 25, 225, 98, 81, 112],
  [77, 193, 137, 31, 19, 38, 22, 153, 247, 105, 122, 2, 245, 133, 242, 8, 175, 95, 100, 9, 167, 105, 214, 111, 57, 121, 21, 1, 253, 57, 54, 101, 248, 202, 69, 50, 150, 177, 226, 5, 9, 5],
  [245, 132, 172, 223, 96, 32, 117, 22, 238, 133, 238, 231, 205, 188, 237, 87, 191, 106, 16, 147, 118, 23, 37, 90, 170, 205, 131, 88, 120, 100, 66, 138, 186, 240, 82, 44, 176, 87, 187, 147, 160, 175, 69, 213, 92, 253, 225, 19],
  [175, 9, 223, 238, 12, 17, 220, 208, 100, 29, 175, 170, 230, 192, 215, 235, 150, 159, 36, 223, 38, 200, 132, 54, 228, 146, 218, 234, 117, 203, 29, 232, 144, 238, 22, 150, 201, 117, 62, 207, 164, 13, 137, 245, 127, 67, 247, 28, 155, 43, 203, 107, 233, 53, 143, 46],
  [242, 93, 169, 50, 144, 210, 39, 118, 202, 188, 201, 189, 143, 108, 196, 37, 185, 112, 134, 230, 245, 63, 197, 190, 250, 106, 185, 221, 175, 64, 114, 71, 161, 44, 147, 6, 27, 218, 51, 63, 87, 10, 40, 130, 188, 17, 163, 31, 176, 170, 4, 107, 232, 7, 94, 166, 224, 124, 86, 47, 11, 204],
  [220, 228, 173, 89, 251, 149, 159, 56, 89, 33, 147, 244, 154, 36, 73, 127, 213, 136, 248, 180, 234, 197, 158, 177, 68, 122, 93, 213, 15, 160, 227, 236, 66, 139, 153, 185, 202, 167, 179, 25, 220, 232, 96, 210, 231, 136, 223, 239, 181, 241, 59, 52, 172, 25, 49, 232, 211, 189, 64, 54, 108, 153, 132, 63, 96, 103, 82, 186],
]
const DM_LOG = new Array(256).fill(0)
const DM_ALOG = new Array(255).fill(0)
initDmGaloisTables()

export class DmCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Data Matrix data must be a non-empty string.')
    }

    this.data = data
    this.options = {
      shape: 'auto',
      encoding: DEFAULT_ENCODING,
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
    const macroInput = normalizeMacro(this.data, this.options.macro)
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
    const input = encodeInputBytes(macroInput.payload, this.options.encoding)
    const leadingGs1 = gs1 && (!structuredAppend || structuredAppend.metadata.position === 1)
    const prefixCodewords = [
      ...(structuredAppend?.codewords ?? []),
      ...(readerProgramming ? [234] : []),
      ...(macroInput.macro === null ? [] : [MACRO_CODEWORDS[macroInput.macro]]),
      ...(leadingGs1 ? [232] : []),
      ...input.eciCodewords,
    ]
    const encoded = encodeMinimalDataMatrix(input.bytes, capacities, prefixCodewords, { fnc1: gs1 ? 29 : null })
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
      payloadBytes: input.bytes,
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
  if (!['auto', 'square', 'rectangle'].includes(shape)) {
    throw new Error(`Unsupported Data Matrix shape: ${options.shape}`)
  }
  const minSize = parseDimensions(options.minSize, 'minSize')
  const maxSize = parseDimensions(options.maxSize, 'maxSize')
  const symbolSize = parseDimensions(options.symbolSize, 'symbolSize')
  if (minSize && maxSize && (minSize.rows > maxSize.rows || minSize.cols > maxSize.cols)) {
    throw new Error('minSize must fit within maxSize.')
  }
  if (symbolSize && !DM_SYMBOLS.some((symbol) => symbol.rows === symbolSize.rows && symbol.cols === symbolSize.cols)) {
    throw new Error(`Unsupported Data Matrix symbol size: ${symbolSize.rows}x${symbolSize.cols}`)
  }
  return { shape, minSize, maxSize, symbolSize }
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
  for (const macro of [5, 6]) {
    const header = MACRO_HEADERS[macro]
    if (data.startsWith(header) && data.endsWith(MACRO_TRAILER)) {
      return { macro, payload: data.slice(header.length, -MACRO_TRAILER.length) }
    }
  }
  return null
}

function encodeInputBytes(data, encoding) {
  const normalized = normalizeEncoding(encoding)
  if (normalized === 'utf-8') {
    const bytes = Array.from(new TextEncoder().encode(data))
    const needsEci = bytes.some((value) => value >= 128)
    return {
      encoding: normalized,
      bytes,
      eciAssignmentNumber: needsEci ? ECI_ASSIGNMENT_UTF8 : null,
      eciCodewords: needsEci ? [241, ECI_ASSIGNMENT_UTF8 + 1] : [],
    }
  }

  const bytes = Array.from(data, (character) => character.charCodeAt(0))
  if (bytes.some((value) => value > 255)) {
    throw new Error('Data contains characters that are not representable in ISO-8859-1.')
  }
  return { encoding: normalized, bytes, eciAssignmentNumber: null, eciCodewords: [] }
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
    if (constraints.shape === 'square' && candidate.rectangular) return false
    if (constraints.shape === 'rectangle' && !candidate.rectangular) return false
    if (constraints.symbolSize && (candidate.rows !== constraints.symbolSize.rows || candidate.cols !== constraints.symbolSize.cols)) return false
    return (
      (!constraints.minSize || (candidate.rows >= constraints.minSize.rows && candidate.cols >= constraints.minSize.cols)) &&
      (!constraints.maxSize || (candidate.rows <= constraints.maxSize.rows && candidate.cols <= constraints.maxSize.cols))
    )
  })
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
    const ecc = createEccBlock(dataCodewords, symbol.rsBlockError)
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
    const ecc = createEccBlock(tempData, symbol.rsBlockError)
    const interleavedBlock = symbol.rsBlockDataLengths ? (block + 2) % blockCount : block
    let pos = 0
    for (let e = interleavedBlock; e < symbol.rsBlockError * blockCount; e += blockCount) {
      result[symbol.dataCodewords + e] = ecc[pos]
      pos += 1
    }
  }

  return result
}

function createEccBlock(data, numEcWords) {
  const factorIndex = DM_FACTOR_SETS.indexOf(numEcWords)
  if (factorIndex < 0) {
    throw new Error(`Unsupported ECC word count: ${numEcWords}`)
  }
  const poly = DM_FACTORS[factorIndex]
  const ecc = new Array(numEcWords).fill(0)

  for (let i = 0; i < data.length; i += 1) {
    const m = ecc[numEcWords - 1] ^ data[i]
    for (let k = numEcWords - 1; k > 0; k -= 1) {
      if (m !== 0 && poly[k] !== 0) {
        ecc[k] = ecc[k - 1] ^ dmMultiplyLog(m, poly[k])
      } else {
        ecc[k] = ecc[k - 1]
      }
    }
    if (m !== 0 && poly[0] !== 0) {
      ecc[0] = dmMultiplyLog(m, poly[0])
    } else {
      ecc[0] = 0
    }
  }

  const reversed = new Array(numEcWords)
  for (let i = 0; i < numEcWords; i += 1) {
    reversed[i] = ecc[numEcWords - i - 1]
  }
  return reversed
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

function initDmGaloisTables() {
  let p = 1
  for (let i = 0; i < 255; i += 1) {
    DM_ALOG[i] = p
    DM_LOG[p] = i
    p *= 2
    if (p >= 256) {
      p ^= DM_PRIMITIVE
    }
  }
}

function dmMultiplyLog(a, b) {
  return DM_ALOG[(DM_LOG[a] + DM_LOG[b]) % 255]
}

function createSquareArray(rows, cols, initialValue) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => initialValue))
}
