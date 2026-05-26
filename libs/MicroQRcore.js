// ==========================================
// MicroQRcore.js - Dependency-free Micro QR generator
// Compact build for M1-M4 with ECC + mask + format info
// ==========================================
import { SHIFT_JIS_KANJI_CODEPOINT_TO_VALUE } from './shiftJisKanjiMap.js'

const MODE = {
  NUMERIC: 'numeric',
  ALPHANUMERIC: 'alphanumeric',
  BYTE: 'byte',
  KANJI: 'kanji',
}

const ECL = {
  NONE: 'NONE',
  L: 'L',
  M: 'M',
  Q: 'Q',
}

// Internal version constants aligned to ISO-style Micro ordering.
// M1=-3, M2=-2, M3=-1, M4=0
const MICRO_SYMBOLS = [
  { name: 'M1', v: -3, size: 11, ecl: [ECL.NONE], cap: { numeric: 5, alphanumeric: 0, byte: 0 } },
  { name: 'M2', v: -2, size: 13, ecl: [ECL.L, ECL.M], cap: { numeric: 10, alphanumeric: 6, byte: 0 } },
  { name: 'M3', v: -1, size: 15, ecl: [ECL.L, ECL.M], cap: { numeric: 23, alphanumeric: 14, byte: 9 } },
  { name: 'M4', v: 0, size: 17, ecl: [ECL.L, ECL.M, ECL.Q], cap: { numeric: 35, alphanumeric: 21, byte: 15 } },
]

const MODE_BITS_MICRO = {
  [MODE.NUMERIC]: 0,
  [MODE.ALPHANUMERIC]: 1,
  [MODE.BYTE]: 2,
  [MODE.KANJI]: 3,
}

const CHAR_COUNT_BITS = {
  [MODE.NUMERIC]: { [-3]: 3, [-2]: 4, [-1]: 5, [0]: 6 },
  [MODE.ALPHANUMERIC]: { [-2]: 3, [-1]: 4, [0]: 5 },
  [MODE.BYTE]: { [-1]: 4, [0]: 5 },
  [MODE.KANJI]: { [-1]: 3, [0]: 4 },
}

const TERMINATOR_LENGTH = { [-3]: 3, [-2]: 5, [-1]: 7, [0]: 9 }

const SYMBOL_CAPACITY_BITS = {
  [-3]: { [ECL.NONE]: 20 },
  [-2]: { [ECL.L]: 40, [ECL.M]: 32 },
  [-1]: { [ECL.L]: 84, [ECL.M]: 68 },
  [0]: { [ECL.L]: 128, [ECL.M]: 112, [ECL.Q]: 80 },
}

const ECC_LAYOUT = {
  [-3]: { [ECL.NONE]: { total: 5, data: 3 } },
  [-2]: { [ECL.L]: { total: 10, data: 5 }, [ECL.M]: { total: 10, data: 4 } },
  [-1]: { [ECL.L]: { total: 17, data: 11 }, [ECL.M]: { total: 17, data: 9 } },
  [0]: { [ECL.L]: { total: 24, data: 16 }, [ECL.M]: { total: 24, data: 14 }, [ECL.Q]: { total: 24, data: 10 } },
}

// 32 valid Micro QR format words (15 bits each)
const FORMAT_INFO_MICRO = [
  17477, 16754, 20011, 19228, 21934, 20633, 24512, 23287,
  26515, 25252, 28157, 26826, 30328, 29519, 31766, 31009,
  1758, 1001, 3248, 2439, 5941, 4610, 7515, 6252,
  9480, 8255, 12134, 10833, 13539, 12756, 16013, 15290,
]

// Micro format mapping index prefix
const ECL_TO_MICRO_PREFIX = {
  [-3]: { [ECL.NONE]: 0 },
  [-2]: { [ECL.L]: 1, [ECL.M]: 2 },
  [-1]: { [ECL.L]: 3, [ECL.M]: 4 },
  [0]: { [ECL.L]: 5, [ECL.M]: 6, [ECL.Q]: 7 },
}

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
const PAD_CODEWORDS = [0xec, 0x11]

const FINDER_PATTERN = [
  [1, 1, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

export class MicroQrCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Micro QR data must be a non-empty string.')
    }

    this.data = data
    this.options = {
      preferredMode: 'auto', // auto|numeric|alphanumeric|byte
      errorCorrectionLevel: 'auto', // auto|NONE|L|M|Q
      minVersion: 'M1',
      maxVersion: 'M4',
      mask: -1, // -1 => auto
      byteEncoding: 'latin1', // latin1|utf8|windows1252|shift_jis
      ...options,
    }
  }

  generate() {
    const byteEncoding = normalizeByteEncoding(this.options.byteEncoding)
    const mode = chooseMode(this.data, this.options.preferredMode, byteEncoding)
    const minIndex = versionToIndex(this.options.minVersion)
    const maxIndex = versionToIndex(this.options.maxVersion)
    if (minIndex > maxIndex) {
      throw new Error('minVersion must be less than or equal to maxVersion.')
    }

    const symbol = chooseSymbol(this.data, mode, this.options.errorCorrectionLevel, minIndex, maxIndex, byteEncoding)
    const dataBits = buildDataBits(this.data, mode, symbol, byteEncoding)
    const finalBits = makeFinalMessageBits(symbol, dataBits)
    const { modules, selectedMask } = buildMatrix(symbol, finalBits, this.options.mask)

    return {
      format: 'microqr',
      data: this.data,
      version: symbol.name,
      size: symbol.size,
      errorCorrectionLevel: symbol.ecl,
      mode,
      byteEncoding: mode === MODE.BYTE ? byteEncoding : null,
      mask: selectedMask,
      modules,
      readyForScan: true,
    }
  }
}

function chooseMode(data, preferredMode, byteEncoding) {
  const mode = String(preferredMode || 'auto').toLowerCase()
  if (mode === MODE.NUMERIC) {
    ensureNumeric(data)
    return MODE.NUMERIC
  }
  if (mode === MODE.ALPHANUMERIC) {
    ensureAlphanumeric(data)
    return MODE.ALPHANUMERIC
  }
  if (mode === MODE.BYTE) {
    ensureByteEncodable(data, byteEncoding)
    return MODE.BYTE
  }
  if (mode === MODE.KANJI) {
    ensureKanjiEncodable(data)
    return MODE.KANJI
  }
  if (mode !== 'auto') {
    throw new Error(`Unsupported preferredMode: ${preferredMode}`)
  }

  if (isNumeric(data)) return MODE.NUMERIC
  if (isAlphanumeric(data)) return MODE.ALPHANUMERIC
  if (isKanjiEncodable(data)) return MODE.KANJI
  ensureByteEncodable(data, byteEncoding)
  return MODE.BYTE
}

function chooseSymbol(data, mode, preferredEcl, minIndex, maxIndex, byteEncoding) {
  const preferred = String(preferredEcl || 'auto').toUpperCase()
  const autoEcl = preferred === 'AUTO'

  for (let i = minIndex; i <= maxIndex; i += 1) {
    const candidate = MICRO_SYMBOLS[i]
    if (candidate.cap[mode] <= 0) continue
    if (!CHAR_COUNT_BITS[mode]?.[candidate.v]) continue

    if (!autoEcl) {
      if (candidate.ecl.includes(preferred) && canEncodeInSymbol(data, mode, candidate, preferred, byteEncoding)) {
        return { ...candidate, ecl: preferred }
      }
      continue
    }

    for (let e = candidate.ecl.length - 1; e >= 0; e -= 1) {
      const ecl = candidate.ecl[e]
      if (canEncodeInSymbol(data, mode, candidate, ecl, byteEncoding)) {
        return { ...candidate, ecl }
      }
    }
  }

  throw new Error(`Input exceeds Micro QR capacity for mode "${mode}" in selected version range.`)
}

function canEncodeInSymbol(data, mode, symbol, ecl, byteEncoding) {
  const capacityBits = SYMBOL_CAPACITY_BITS[symbol.v][ecl]
  if (!capacityBits) return false

  const length = mode === MODE.BYTE ? encodeByteArray(data, byteEncoding).length : data.length
  const cciBits = CHAR_COUNT_BITS[mode]?.[symbol.v]
  if (!cciBits) return false

  const modeBits = symbol.v > -3 ? symbol.v + 3 : 0
  const payloadBits = encodePayloadBits(data, mode, byteEncoding).length
  return modeBits + cciBits + payloadBits <= capacityBits
}

function buildDataBits(data, mode, symbol, byteEncoding) {
  const capacityBits = SYMBOL_CAPACITY_BITS[symbol.v][symbol.ecl]
  const bits = []

  // M1 has no mode indicator.
  if (symbol.v > -3) {
    appendBits(bits, MODE_BITS_MICRO[mode], symbol.v + 3)
  }
  appendBits(bits, mode === MODE.BYTE ? encodeByteArray(data, byteEncoding).length : data.length, CHAR_COUNT_BITS[mode][symbol.v])
  bits.push(...encodePayloadBits(data, mode, byteEncoding))

  // Terminator
  const terminator = Math.min(capacityBits - bits.length, TERMINATOR_LENGTH[symbol.v])
  for (let i = 0; i < terminator; i += 1) bits.push(0)

  // Byte boundary padding except M1/M3.
  if (symbol.v !== -3 && symbol.v !== -1) {
    while (bits.length % 8 !== 0) bits.push(0)
  }

  // Pad codewords
  if (symbol.v === -3 || symbol.v === -1) {
    while (bits.length < capacityBits) bits.push(0)
  } else {
    let index = 0
    while (bits.length < capacityBits) {
      appendBits(bits, PAD_CODEWORDS[index % 2], 8)
      index += 1
    }
  }

  if (bits.length !== capacityBits) {
    throw new Error('Internal Micro QR bitstream sizing error.')
  }

  return bits
}

function encodePayloadBits(data, mode, byteEncoding) {
  if (mode === MODE.NUMERIC) return encodeNumeric(data)
  if (mode === MODE.ALPHANUMERIC) return encodeAlphanumeric(data)
  if (mode === MODE.KANJI) return encodeKanji(data)
  return encodeByte(data, byteEncoding)
}

function encodeNumeric(data) {
  ensureNumeric(data)
  const bits = []
  for (let i = 0; i < data.length; i += 3) {
    const chunk = data.slice(i, i + 3)
    if (chunk.length === 3) appendBits(bits, Number(chunk), 10)
    else if (chunk.length === 2) appendBits(bits, Number(chunk), 7)
    else appendBits(bits, Number(chunk), 4)
  }
  return bits
}

function encodeAlphanumeric(data) {
  ensureAlphanumeric(data)
  const bits = []
  for (let i = 0; i < data.length; i += 2) {
    const first = ALPHANUMERIC_CHARSET.indexOf(data[i])
    if (i + 1 < data.length) {
      const second = ALPHANUMERIC_CHARSET.indexOf(data[i + 1])
      appendBits(bits, first * 45 + second, 11)
    } else {
      appendBits(bits, first, 6)
    }
  }
  return bits
}

function encodeByte(data, byteEncoding) {
  const bits = []
  const bytes = encodeByteArray(data, byteEncoding)
  for (const value of bytes) appendBits(bits, value, 8)
  return bits
}

function encodeKanji(data) {
  const bits = []
  const bytes = encodeShiftJisBytes(data, { strictKanjiOnly: true })
  for (let i = 0; i < bytes.length; i += 2) {
    const value = (bytes[i] << 8) | bytes[i + 1]
    let adjusted
    if (value >= 0x8140 && value <= 0x9ffc) {
      adjusted = value - 0x8140
    } else if (value >= 0xe040 && value <= 0xebbf) {
      adjusted = value - 0xc140
    } else {
      throw new Error(`Shift_JIS value 0x${value.toString(16)} is not valid for Kanji mode.`)
    }
    const encoded = ((adjusted >> 8) * 0xc0) + (adjusted & 0xff)
    appendBits(bits, encoded, 13)
  }
  return bits
}

function makeFinalMessageBits(symbol, dataBits) {
  const layout = ECC_LAYOUT[symbol.v][symbol.ecl]
  const dataCodewords = bitsToCodewords(dataBits)
  if (dataCodewords.length !== layout.data) {
    throw new Error(`Internal Micro QR data codeword mismatch (${dataCodewords.length} != ${layout.data}).`)
  }

  const eccCount = layout.total - layout.data
  const eccCodewords = reedSolomonRemainder(dataCodewords, eccCount)

  const finalBits = []
  let nibble = null
  if (symbol.v === -3 || symbol.v === -1) {
    nibble = (dataCodewords[dataCodewords.length - 1] >> 4) & 0x0f
    dataCodewords.pop()
  }

  for (const cw of dataCodewords) appendBits(finalBits, cw, 8)
  if (nibble != null) appendBits(finalBits, nibble, 4)
  for (const cw of eccCodewords) appendBits(finalBits, cw, 8)

  return finalBits
}

function buildMatrix(symbol, finalBits, maskPreference) {
  const base = createBaseMatrix(symbol.size)
  const candidates = []
  const maskFns = getMicroMaskFunctions()

  const minMask = maskPreference >= 0 && maskPreference <= 3 ? maskPreference : 0
  const maxMask = maskPreference >= 0 && maskPreference <= 3 ? maskPreference : 3

  for (let mask = minMask; mask <= maxMask; mask += 1) {
    const matrix = cloneMatrix(base.matrix)
    addCodewords(matrix, finalBits, symbol.v)
    applyMask(matrix, base.isFunction, maskFns[mask])
    addFormatInfoMicro(matrix, symbol.v, symbol.ecl, mask)
    candidates.push({ mask, matrix, score: evaluateMicroMask(matrix) })
  }

  // Micro QR: higher score is better (per ISO evaluation function).
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  return {
    selectedMask: best.mask,
    modules: best.matrix.map((row) => row.map((value) => (value & 1) === 1)),
  }
}

function createBaseMatrix(size) {
  const matrix = createSquareArray(size, 2) // 2 => unset/data area
  const isFunction = createSquareArray(size, false)

  // Reserve format region (row 8 / col 8)
  for (let i = 0; i < 9 && i < size; i += 1) {
    matrix[i][8] = 0
    matrix[8][i] = 0
    isFunction[i][8] = true
    isFunction[8][i] = true
  }

  // Timing pattern for Micro (starts at index 8 on top row + left col)
  let bit = 1
  for (let i = 8; i < size; i += 1) {
    matrix[i][0] = bit
    matrix[0][i] = bit
    isFunction[i][0] = true
    isFunction[0][i] = true
    bit ^= 1
  }

  // Single finder + separator (top-left)
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      matrix[y][x] = FINDER_PATTERN[y][x]
      isFunction[y][x] = true
    }
  }

  return { matrix, isFunction }
}

function addCodewords(matrix, codewords, version) {
  const size = matrix.length
  const isMicro = true
  const inc = version === -3 || version === -1 ? 2 : 0
  let index = 0

  for (let right = size - 1; right > 0; right -= 2) {
    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let z = 0; z < 2; z += 1) {
        const x = right - z
        const upwards = ((right + inc) & 2) === 0
        const y = upwards ? size - 1 - vertical : vertical
        if (matrix[y][x] === 2 && index < codewords.length) {
          matrix[y][x] = codewords[index]
          index += 1
        }
      }
    }
  }

  if (index !== codewords.length) {
    throw new Error(`Failed to place all Micro QR bits (${index}/${codewords.length}).`)
  }
}

function applyMask(matrix, isFunction, maskFn) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix.length; x += 1) {
      if (!isFunction[y][x] && maskFn(y, x)) {
        matrix[y][x] ^= 1
      }
    }
  }
}

function getMicroMaskFunctions() {
  return [
    (i, j) => (i & 1) === 0,
    (i, j) => ((Math.floor(i / 2) + Math.floor(j / 3)) & 1) === 0,
    (i, j) => ((((i * j) & 1) + ((i * j) % 3)) & 1) === 0,
    (i, j) => ((((i + j) & 1) + ((i * j) % 3)) & 1) === 0,
  ]
}

function addFormatInfoMicro(matrix, version, ecl, mask) {
  const prefix = ECL_TO_MICRO_PREFIX[version][ecl]
  const fmt = mask + (prefix << 2)
  const formatInfo = FORMAT_INFO_MICRO[fmt]

  // Place 15 format bits into top-left format region for Micro.
  for (let i = 0; i < 8; i += 1) {
    const vbit = (formatInfo >> i) & 1
    const hbit = (formatInfo >> (14 - i)) & 1
    matrix[i + 1][8] = vbit
    matrix[8][i + 1] = hbit
  }
}

function evaluateMicroMask(matrix) {
  const size = matrix.length
  let sumCol = 0
  let sumRow = 0
  for (let i = 1; i < size; i += 1) {
    sumCol += matrix[i][size - 1]
    sumRow += matrix[size - 1][i]
  }
  return sumCol <= sumRow ? sumCol * 16 + sumRow : sumRow * 16 + sumCol
}

function reedSolomonRemainder(data, degree) {
  const divisor = reedSolomonGenerator(degree)
  const result = new Array(degree).fill(0)

  for (const value of data) {
    const factor = value ^ result.shift()
    result.push(0)
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= multiplyFiniteField(divisor[i], factor)
    }
  }

  return result
}

function reedSolomonGenerator(degree) {
  let result = [1]
  let root = 1
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(result.length + 1).fill(0)
    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= multiplyFiniteField(result[j], root)
      next[j + 1] ^= result[j]
    }
    result = next
    root = multiplyFiniteField(root, 0x02)
  }
  result.pop()
  return result.reverse()
}

function multiplyFiniteField(x, y) {
  let z = 0
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    if (((y >>> i) & 1) !== 0) z ^= x
  }
  return z
}

function bitsToCodewords(bits) {
  const result = []
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | (bits[i + j] ?? 0)
    }
    result.push(value)
  }
  return result
}

function appendBits(bitBuffer, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bitBuffer.push((value >>> i) & 1)
  }
}

function ensureNumeric(data) {
  if (!isNumeric(data)) throw new Error('Data contains non-numeric characters.')
}

function ensureAlphanumeric(data) {
  if (!isAlphanumeric(data)) {
    throw new Error('Data contains non-alphanumeric characters for Micro QR alphanumeric mode.')
  }
}

function ensureLatin1(data) {
  for (let i = 0; i < data.length; i += 1) {
    if (data.charCodeAt(i) > 255) {
      throw new Error('Micro QR byte mode currently supports Latin-1 characters only.')
    }
  }
}

function encodeLatin1Bytes(data) {
  ensureLatin1(data)
  const bytes = new Array(data.length)
  for (let i = 0; i < data.length; i += 1) {
    bytes[i] = data.charCodeAt(i) & 0xff
  }
  return bytes
}

function encodeUtf8Bytes(data) {
  return Array.from(new TextEncoder().encode(data))
}

const WINDOWS_1252_EXTENDED = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C],
  [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
  [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
  [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
])

function encodeWindows1252Bytes(data) {
  const bytes = []
  for (let i = 0; i < data.length; i += 1) {
    const cp = data.codePointAt(i)
    if (cp > 0xffff) {
      i += 1
    }

    if (cp <= 0x7f || (cp >= 0xa0 && cp <= 0xff)) {
      bytes.push(cp & 0xff)
      continue
    }
    const mapped = WINDOWS_1252_EXTENDED.get(cp)
    if (mapped != null) {
      bytes.push(mapped)
      continue
    }
    throw new Error(`Character U+${cp.toString(16).toUpperCase()} is not encodable in Windows-1252.`)
  }
  return bytes
}

function encodeShiftJisBytes(data, options = {}) {
  const { strictKanjiOnly = false } = options
  const bytes = []
  for (const char of data) {
    const cp = char.codePointAt(0)
    if (cp > 0xffff) {
      throw new Error(`Character U+${cp.toString(16).toUpperCase()} is not encodable in supported Shift_JIS subset.`)
    }

    const kanjiValue = SHIFT_JIS_KANJI_CODEPOINT_TO_VALUE.get(cp)
    if (kanjiValue != null) {
      bytes.push((kanjiValue >> 8) & 0xff, kanjiValue & 0xff)
      continue
    }

    // ASCII
    if (!strictKanjiOnly && cp <= 0x7f) {
      bytes.push(cp)
      continue
    }
    // Halfwidth katakana (JIS X 0201)
    if (!strictKanjiOnly && cp >= 0xff61 && cp <= 0xff9f) {
      bytes.push(cp - 0xff61 + 0xa1)
      continue
    }
    // Common JIS X 0201 single-byte mappings
    if (!strictKanjiOnly && cp === 0x00a5) { // YEN SIGN
      bytes.push(0x5c)
      continue
    }
    if (!strictKanjiOnly && cp === 0x203e) { // OVERLINE
      bytes.push(0x7e)
      continue
    }

    throw new Error(`Character U+${cp.toString(16).toUpperCase()} is not encodable in supported Shift_JIS subset.`)
  }
  return bytes
}

function encodeByteArray(data, byteEncoding) {
  if (byteEncoding === 'latin1') return encodeLatin1Bytes(data)
  if (byteEncoding === 'utf8') return encodeUtf8Bytes(data)
  if (byteEncoding === 'windows1252') return encodeWindows1252Bytes(data)
  return encodeShiftJisBytes(data)
}

function ensureByteEncodable(data, byteEncoding) {
  if (byteEncoding === 'latin1') {
    ensureLatin1(data)
    return
  }
  if (byteEncoding === 'utf8') {
    return
  }
  // Re-use concrete encoders to guarantee identical validation semantics.
  encodeByteArray(data, byteEncoding)
}

function ensureKanjiEncodable(data) {
  if (!isKanjiEncodable(data)) {
    throw new Error('Data contains characters outside supported Kanji mode mapping.')
  }
}

function isKanjiEncodable(data) {
  try {
    const bytes = encodeShiftJisBytes(data, { strictKanjiOnly: true })
    return bytes.length % 2 === 0 && bytes.length > 0
  } catch {
    return false
  }
}

function normalizeByteEncoding(value) {
  const normalized = String(value ?? 'latin1').toLowerCase()
  if (normalized === 'utf8' || normalized === 'utf-8') return 'utf8'
  if (normalized === 'latin1' || normalized === 'latin-1' || normalized === 'iso-8859-1') return 'latin1'
  if (normalized === 'windows1252' || normalized === 'windows-1252' || normalized === 'cp1252') return 'windows1252'
  if (normalized === 'shift_jis' || normalized === 'shift-jis' || normalized === 'sjis') return 'shift_jis'
  throw new Error(`Unsupported byteEncoding: ${value}`)
}

function isNumeric(data) {
  return /^[0-9]+$/.test(data)
}

function isAlphanumeric(data) {
  for (let i = 0; i < data.length; i += 1) {
    if (ALPHANUMERIC_CHARSET.indexOf(data[i]) < 0) return false
  }
  return true
}

function versionToIndex(version) {
  const normalized = String(version || 'M1').toUpperCase()
  const index = MICRO_SYMBOLS.findIndex((symbol) => symbol.name === normalized)
  if (index < 0) throw new Error(`Unsupported Micro QR version: ${version}`)
  return index
}

function createSquareArray(size, value) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value))
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice())
}
