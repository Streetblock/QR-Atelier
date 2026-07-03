// ==========================================
// QrCore.js - Dependency-free QR Code Matrix Generator
// ==========================================

// --- Modul-Konstanten (Privat für dieses Modul) ---
const ECC_LEVELS = {
  L: { formatBits: 1 },
  M: { formatBits: 0 },
  Q: { formatBits: 3 },
  H: { formatBits: 2 },
}

const RS_BLOCKS = {
  1: { L: [[1, 26, 19]], M: [[1, 26, 16]], Q: [[1, 26, 13]], H: [[1, 26, 9]] },
  2: { L: [[1, 44, 34]], M: [[1, 44, 28]], Q: [[1, 44, 22]], H: [[1, 44, 16]] },
  3: { L: [[1, 70, 55]], M: [[1, 70, 44]], Q: [[2, 35, 17]], H: [[2, 35, 13]] },
  4: { L: [[1, 100, 80]], M: [[2, 50, 32]], Q: [[2, 50, 24]], H: [[4, 25, 9]] },
  5: { L: [[1, 134, 108]], M: [[2, 67, 43]], Q: [[2, 33, 15], [2, 34, 16]], H: [[2, 33, 11], [2, 34, 12]] },
  6: { L: [[2, 86, 68]], M: [[4, 43, 27]], Q: [[4, 43, 19]], H: [[4, 43, 15]] },
  7: { L: [[2, 98, 78]], M: [[4, 49, 31]], Q: [[2, 32, 14], [4, 33, 15]], H: [[4, 39, 13], [1, 40, 14]] },
  8: { L: [[2, 121, 97]], M: [[2, 60, 38], [2, 61, 39]], Q: [[4, 40, 18], [2, 41, 19]], H: [[4, 40, 14], [2, 41, 15]] },
  9: { L: [[2, 146, 116]], M: [[3, 58, 36], [2, 59, 37]], Q: [[4, 36, 16], [4, 37, 17]], H: [[4, 36, 12], [4, 37, 13]] },
  10: { L: [[2, 86, 68], [2, 87, 69]], M: [[4, 69, 43], [1, 70, 44]], Q: [[6, 43, 19], [2, 44, 20]], H: [[6, 43, 15], [2, 44, 16]] },
  11: { L: [[4, 101, 81]], M: [[1, 80, 50], [4, 81, 51]], Q: [[4, 50, 22], [4, 51, 23]], H: [[3, 36, 12], [8, 37, 13]] },
  12: { L: [[2, 116, 92], [2, 117, 93]], M: [[6, 58, 36], [2, 59, 37]], Q: [[4, 46, 20], [6, 47, 21]], H: [[7, 42, 14], [4, 43, 15]] },
  13: { L: [[4, 133, 107]], M: [[8, 59, 37], [1, 60, 38]], Q: [[8, 44, 20], [4, 45, 21]], H: [[12, 33, 11], [4, 34, 12]] },
  14: { L: [[3, 145, 115], [1, 146, 116]], M: [[4, 64, 40], [5, 65, 41]], Q: [[11, 36, 16], [5, 37, 17]], H: [[11, 36, 12], [5, 37, 13]] },
  15: { L: [[5, 109, 87], [1, 110, 88]], M: [[5, 65, 41], [5, 66, 42]], Q: [[5, 54, 24], [7, 55, 25]], H: [[11, 36, 12], [7, 37, 13]] },
  16: { L: [[5, 122, 98], [1, 123, 99]], M: [[7, 73, 45], [3, 74, 46]], Q: [[15, 43, 19], [2, 44, 20]], H: [[3, 45, 15], [13, 46, 16]] },
  17: { L: [[1, 135, 107], [5, 136, 108]], M: [[10, 74, 46], [1, 75, 47]], Q: [[1, 50, 22], [15, 51, 23]], H: [[2, 42, 14], [17, 43, 15]] },
  18: { L: [[5, 150, 120], [1, 151, 121]], M: [[9, 69, 43], [4, 70, 44]], Q: [[17, 50, 22], [1, 51, 23]], H: [[2, 42, 14], [19, 43, 15]] },
  19: { L: [[3, 141, 113], [4, 142, 114]], M: [[3, 70, 44], [11, 71, 45]], Q: [[17, 47, 21], [4, 48, 22]], H: [[9, 39, 13], [16, 40, 14]] },
  20: { L: [[3, 135, 107], [5, 136, 108]], M: [[3, 67, 41], [13, 68, 42]], Q: [[15, 54, 24], [5, 55, 25]], H: [[15, 43, 15], [10, 44, 16]] },
  21: { L: [[4, 144, 116], [4, 145, 117]], M: [[17, 68, 42]], Q: [[17, 50, 22], [6, 51, 23]], H: [[19, 46, 16], [6, 47, 17]] },
  22: { L: [[2, 139, 111], [7, 140, 112]], M: [[17, 74, 46]], Q: [[7, 54, 24], [16, 55, 25]], H: [[34, 37, 13]] },
  23: { L: [[4, 151, 121], [5, 152, 122]], M: [[4, 75, 47], [14, 76, 48]], Q: [[11, 54, 24], [14, 55, 25]], H: [[16, 45, 15], [14, 46, 16]] },
  24: { L: [[6, 147, 117], [4, 148, 118]], M: [[6, 73, 45], [14, 74, 46]], Q: [[11, 54, 24], [16, 55, 25]], H: [[30, 46, 16], [2, 47, 17]] },
  25: { L: [[8, 132, 106], [4, 133, 107]], M: [[8, 75, 47], [13, 76, 48]], Q: [[7, 54, 24], [22, 55, 25]], H: [[22, 45, 15], [13, 46, 16]] },
  26: { L: [[10, 142, 114], [2, 143, 115]], M: [[19, 74, 46], [4, 75, 47]], Q: [[28, 50, 22], [6, 51, 23]], H: [[33, 46, 16], [4, 47, 17]] },
  27: { L: [[8, 152, 122], [4, 153, 123]], M: [[22, 73, 45], [3, 74, 46]], Q: [[8, 53, 23], [26, 54, 24]], H: [[12, 45, 15], [28, 46, 16]] },
  28: { L: [[3, 147, 117], [10, 148, 118]], M: [[3, 73, 45], [23, 74, 46]], Q: [[4, 54, 24], [31, 55, 25]], H: [[11, 45, 15], [31, 46, 16]] },
  29: { L: [[7, 146, 116], [7, 147, 117]], M: [[21, 73, 45], [7, 74, 46]], Q: [[1, 53, 23], [37, 54, 24]], H: [[19, 45, 15], [26, 46, 16]] },
  30: { L: [[5, 145, 115], [10, 146, 116]], M: [[19, 75, 47], [10, 76, 48]], Q: [[15, 54, 24], [25, 55, 25]], H: [[23, 45, 15], [25, 46, 16]] },
  31: { L: [[13, 145, 115], [3, 146, 116]], M: [[2, 74, 46], [29, 75, 47]], Q: [[42, 54, 24], [1, 55, 25]], H: [[23, 45, 15], [28, 46, 16]] },
  32: { L: [[17, 145, 115]], M: [[10, 74, 46], [23, 75, 47]], Q: [[10, 54, 24], [35, 55, 25]], H: [[19, 45, 15], [35, 46, 16]] },
  33: { L: [[17, 145, 115], [1, 146, 116]], M: [[14, 74, 46], [21, 75, 47]], Q: [[29, 54, 24], [19, 55, 25]], H: [[11, 45, 15], [46, 46, 16]] },
  34: { L: [[13, 145, 115], [6, 146, 116]], M: [[14, 74, 46], [23, 75, 47]], Q: [[44, 54, 24], [7, 55, 25]], H: [[59, 46, 16], [1, 47, 17]] },
  35: { L: [[12, 151, 121], [7, 152, 122]], M: [[12, 75, 47], [26, 76, 48]], Q: [[39, 54, 24], [14, 55, 25]], H: [[22, 45, 15], [41, 46, 16]] },
  36: { L: [[6, 151, 121], [14, 152, 122]], M: [[6, 75, 47], [34, 76, 48]], Q: [[46, 54, 24], [10, 55, 25]], H: [[2, 45, 15], [64, 46, 16]] },
  37: { L: [[17, 152, 122], [4, 153, 123]], M: [[29, 74, 46], [14, 75, 47]], Q: [[49, 54, 24], [10, 55, 25]], H: [[24, 45, 15], [46, 46, 16]] },
  38: { L: [[4, 152, 122], [18, 153, 123]], M: [[13, 74, 46], [32, 75, 47]], Q: [[48, 54, 24], [14, 55, 25]], H: [[42, 45, 15], [32, 46, 16]] },
  39: { L: [[20, 147, 117], [4, 148, 118]], M: [[40, 75, 47], [7, 76, 48]], Q: [[43, 54, 24], [22, 55, 25]], H: [[10, 45, 15], [67, 46, 16]] },
  40: { L: [[19, 148, 118], [6, 149, 119]], M: [[18, 75, 47], [31, 76, 48]], Q: [[34, 54, 24], [34, 55, 25]], H: [[20, 45, 15], [61, 46, 16]] },
}

const ALIGNMENT_PATTERN_POSITIONS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
  11: [6, 30, 54],
  12: [6, 32, 58],
  13: [6, 34, 62],
  14: [6, 26, 46, 66],
  15: [6, 26, 48, 70],
  16: [6, 26, 50, 74],
  17: [6, 30, 54, 78],
  18: [6, 30, 56, 82],
  19: [6, 30, 58, 86],
  20: [6, 34, 62, 90],
  21: [6, 28, 50, 72, 94],
  22: [6, 26, 50, 74, 98],
  23: [6, 30, 54, 78, 102],
  24: [6, 28, 54, 80, 106],
  25: [6, 32, 58, 84, 110],
  26: [6, 30, 58, 86, 114],
  27: [6, 34, 62, 90, 118],
  28: [6, 26, 50, 74, 98, 122],
  29: [6, 30, 54, 78, 102, 126],
  30: [6, 26, 52, 78, 104, 130],
  31: [6, 30, 56, 82, 108, 134],
  32: [6, 34, 60, 86, 112, 138],
  33: [6, 30, 58, 86, 114, 142],
  34: [6, 34, 62, 90, 118, 146],
  35: [6, 30, 54, 78, 102, 126, 150],
  36: [6, 24, 50, 76, 102, 128, 154],
  37: [6, 28, 54, 80, 106, 132, 158],
  38: [6, 32, 58, 84, 110, 136, 162],
  39: [6, 26, 54, 82, 110, 138, 166],
  40: [6, 30, 58, 86, 114, 142, 170],
}

const MODE_INDICATORS = {
  numeric: 0x1,
  alphanumeric: 0x2,
  byte: 0x4,
  eci: 0x7,
}
const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
const DEFAULT_ENCODING = 'utf-8'
const ECI_ASSIGNMENT_NUMBERS = {
  'iso-8859-1': 3,
  'windows-1252': 23,
  'utf-8': 26,
}
const WINDOWS_1252_EXTENSIONS = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
])
const PAD_CODEWORDS = [0xec, 0x11]
const encoder = new TextEncoder()

export const QrSegment = Object.freeze({
  numeric(data) {
    return createSegment('numeric', String(data))
  },
  alphanumeric(data) {
    return createSegment('alphanumeric', String(data))
  },
  byte(data, options = {}) {
    return createSegment('byte', String(data), options)
  },
  bytes(bytes) {
    return createByteArraySegment(bytes)
  },
})

// --- Die exportierte Hauptklasse ---
export class QrCore {
  constructor(data, options = {}) {
    const hasSegments = Array.isArray(options.segments) && options.segments.length > 0
    if ((typeof data !== 'string' || data.length === 0) && !hasSegments) {
      throw new Error('QR data must be a non-empty string.')
    }

    this.data = String(data ?? '')
    this.options = {
      errorCorrectionLevel: 'Q',
      minVersion: 1,
      maxVersion: 40,
      mask: -1,
      mode: 'auto',
      encoding: DEFAULT_ENCODING,
      ...options,
    }
  }

  /**
   * Generiert die Matrix-Datenbank des QR-Codes.
   * @returns {Object} Ein Objekt mit Meta-Daten und der 2D-Matrix
   */
  generate() {
    const errorCorrectionLevel = this.#normalizeErrorCorrectionLevel(this.options.errorCorrectionLevel)
    const minVersion = this.#clampVersion(this.options.minVersion)
    const maxVersion = this.#clampVersion(this.options.maxVersion)

    if (minVersion > maxVersion) {
      throw new Error('minVersion must be less than or equal to maxVersion.')
    }

    const segmentCandidates = createSegmentCandidates(this.data, this.options)
    const { version, segments } = this.#chooseVersion(segmentCandidates, errorCorrectionLevel, minVersion, maxVersion)
    const modules = this.#buildMatrix(segments, version, errorCorrectionLevel, this.options.mask)

    return {
      data: this.data,
      version,
      size: modules.length,
      errorCorrectionLevel,
      modules,
    }
  }

  // --- Private Class Methods ---

  #normalizeErrorCorrectionLevel(level) {
    const normalized = String(level ?? 'Q').toUpperCase()
    if (!ECC_LEVELS[normalized]) {
      throw new Error(`Unsupported error correction level: ${level}`)
    }
    return normalized
  }

  #clampVersion(version) {
    const numeric = Number(version)
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 40) {
      throw new Error('QR versions must be between 1 and 40.')
    }
    return numeric
  }

  #chooseVersion(segmentCandidates, ecl, minVersion, maxVersion) {
    for (let version = minVersion; version <= maxVersion; version += 1) {
      const dataCapacityBits = getDataCapacityBits(version, ecl)
      const bestCandidate = segmentCandidates
        .map((segments) => ({ segments, neededBits: getSegmentsBitLength(segments, version) }))
        .sort((a, b) => a.neededBits - b.neededBits)[0]

      if (bestCandidate.neededBits <= dataCapacityBits) {
        return { version, segments: bestCandidate.segments }
      }
    }
    throw new Error('Input is too large for the configured QR version range.')
  }

  #buildMatrix(segments, version, ecl, maskPreference) {
    const size = version * 4 + 17
    const modules = createSquareArray(size, null)
    const isFunction = createSquareArray(size, false)

    drawFunctionPatterns(modules, isFunction, version)
    drawCodewords(modules, isFunction, createCodewords(segments, version, ecl))

    let selectedMask = maskPreference
    if (selectedMask < 0 || selectedMask > 7) {
      let bestPenalty = Infinity
      for (let mask = 0; mask < 8; mask += 1) {
        const candidate = cloneMatrix(modules)
        applyMask(candidate, isFunction, mask)
        drawFormatBits(candidate, isFunction, ecl, mask)
        if (version >= 7) {
          drawVersionBits(candidate, isFunction, version)
        }
        const penalty = getPenaltyScore(candidate)
        if (penalty < bestPenalty) {
          bestPenalty = penalty
          selectedMask = mask
        }
      }
    }

    applyMask(modules, isFunction, selectedMask)
    drawFormatBits(modules, isFunction, ecl, selectedMask)
    if (version >= 7) {
      drawVersionBits(modules, isFunction, version)
    }

    return modules.map((row) => row.map(Boolean))
  }
}

// ==========================================
// Modul-Scope Helfer-Funktionen (Reine Logik, gekapselt)
// ==========================================

function getDataCapacityBits(version, ecl) {
  return getRsBlocks(version, ecl).reduce((sum, block) => sum + block.dataCount, 0) * 8
}

function getRsBlocks(version, ecl) {
  const groups = RS_BLOCKS[version]?.[ecl]
  if (!groups) {
    throw new Error(`Missing RS block configuration for version ${version} ${ecl}.`)
  }

  const blocks = []
  for (const [count, totalCount, dataCount] of groups) {
    for (let i = 0; i < count; i += 1) {
      blocks.push({ totalCount, dataCount, eccCount: totalCount - dataCount })
    }
  }
  return blocks
}

function createCodewords(segments, version, ecl) {
  const blocks = getRsBlocks(version, ecl)
  const bitBuffer = []
  appendSegments(bitBuffer, segments, version)

  const dataCapacityBits = getDataCapacityBits(version, ecl)
  appendBits(bitBuffer, 0, Math.min(4, dataCapacityBits - bitBuffer.length))
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0)
  }

  const dataCodewords = []
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let value = 0
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | bitBuffer[i + j]
    }
    dataCodewords.push(value)
  }

  while (dataCodewords.length < dataCapacityBits / 8) {
    dataCodewords.push(PAD_CODEWORDS[dataCodewords.length % 2])
  }

  const dataBlocks = []
  let offset = 0
  for (const block of blocks) {
    dataBlocks.push(dataCodewords.slice(offset, offset + block.dataCount))
    offset += block.dataCount
  }

  const eccBlocks = dataBlocks.map((block, index) => reedSolomonRemainder(block, blocks[index].eccCount))
  const codewords = []
  const maxDataCount = Math.max(...dataBlocks.map((block) => block.length))
  const maxEccCount = Math.max(...eccBlocks.map((block) => block.length))

  for (let i = 0; i < maxDataCount; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        codewords.push(block[i])
      }
    }
  }

  for (let i = 0; i < maxEccCount; i += 1) {
    for (const block of eccBlocks) {
      if (i < block.length) {
        codewords.push(block[i])
      }
    }
  }

  return codewords
}

function createSegmentCandidates(data, options = {}) {
  if (Array.isArray(options.segments) && options.segments.length > 0) {
    return [withEciSegments(normalizeSegments(options.segments), options)]
  }

  const mode = normalizeMode(options.mode)
  const encoding = normalizeEncoding(options.encoding)

  if (mode !== 'auto') {
    return [withEciSegments([createSegment(mode, data, { encoding })], options)]
  }

  const autoSegments = createAutoSegments(data, encoding)
  const byteSegments = [createSegment('byte', data, { encoding })]
  if (autoSegments.length === 1 && autoSegments[0].mode === 'byte') {
    return [withEciSegments(autoSegments, options)]
  }
  return [withEciSegments(autoSegments, options), withEciSegments(byteSegments, options)]
}

function createAutoSegments(data, encoding = DEFAULT_ENCODING) {
  if (isNumeric(data)) {
    return [createSegment('numeric', data)]
  }
  if (isAlphanumeric(data)) {
    return [createSegment('alphanumeric', data)]
  }

  const segments = []
  let currentMode = null
  let currentText = ''

  for (const char of data) {
    const nextMode = isAlphanumeric(char) ? 'alphanumeric' : 'byte'
    if (nextMode !== currentMode && currentText) {
      segments.push(createSegment(currentMode, currentText, { encoding }))
      currentText = ''
    }
    currentMode = nextMode
    currentText += char
  }

  if (currentText) {
    segments.push(createSegment(currentMode, currentText, { encoding }))
  }

  return segments
}

function normalizeSegments(segments) {
  return segments.map((segment) => {
    if (!segment || typeof segment !== 'object') {
      throw new Error('QR segments must be objects.')
    }
    return createSegment(segment.mode, segment.text ?? '', {
      bytes: segment.bytes,
      encoding: segment.encoding,
    })
  })
}

function createSegment(mode, text, options = {}) {
  const normalizedMode = normalizeMode(mode, false)
  const normalizedText = String(text)
  const hasRawBytes = options.bytes !== undefined

  if (normalizedMode === 'numeric' && !isNumeric(normalizedText)) {
    throw new Error('Numeric QR segments may only contain digits 0-9.')
  }
  if (normalizedMode === 'alphanumeric' && !isAlphanumeric(normalizedText)) {
    throw new Error(`Alphanumeric QR segments may only contain: ${ALPHANUMERIC_CHARSET}`)
  }

  return {
    mode: normalizedMode,
    text: normalizedText,
    encoding: normalizedMode === 'byte' && (!hasRawBytes || options.encoding) ? normalizeEncoding(options.encoding) : null,
    bytes: normalizedMode === 'byte' ? normalizeByteSegmentBytes(normalizedText, options) : null,
  }
}

function createByteArraySegment(bytes) {
  if (!bytes || typeof bytes[Symbol.iterator] !== 'function') {
    throw new Error('Byte QR segments require an iterable of byte values.')
  }
  return createSegment('byte', '', { bytes: Array.from(bytes) })
}

function appendSegments(bitBuffer, segments, version) {
  for (const segment of segments) {
    appendBits(bitBuffer, MODE_INDICATORS[segment.mode], 4)
    if (segment.mode === 'eci') {
      appendEciAssignmentNumber(bitBuffer, segment.assignmentNumber)
      continue
    }

    appendBits(bitBuffer, getSegmentCharacterCount(segment), getCharacterCountBits(segment.mode, version))

    if (segment.mode === 'numeric') {
      appendNumericSegment(bitBuffer, segment.text)
    } else if (segment.mode === 'alphanumeric') {
      appendAlphanumericSegment(bitBuffer, segment.text)
    } else {
      appendByteSegment(bitBuffer, segment.bytes)
    }
  }
}

function getSegmentsBitLength(segments, version) {
  return segments.reduce((sum, segment) => {
    if (segment.mode === 'eci') {
      return sum + 4 + getEciAssignmentNumberBitLength(segment.assignmentNumber)
    }
    const headerBits = 4 + getCharacterCountBits(segment.mode, version)
    return sum + headerBits + getSegmentDataBitLength(segment)
  }, 0)
}

function getCharacterCountBits(mode, version) {
  const group = version < 10 ? 0 : version < 27 ? 1 : 2
  const bits = {
    numeric: [10, 12, 14],
    alphanumeric: [9, 11, 13],
    byte: [8, 16, 16],
  }
  return bits[mode][group]
}

function getSegmentCharacterCount(segment) {
  return segment.mode === 'byte' ? segment.bytes.length : segment.text.length
}

function getSegmentDataBitLength(segment) {
  if (segment.mode === 'numeric') {
    const fullGroups = Math.floor(segment.text.length / 3)
    const remainder = segment.text.length % 3
    return fullGroups * 10 + (remainder === 2 ? 7 : remainder === 1 ? 4 : 0)
  }
  if (segment.mode === 'alphanumeric') {
    return Math.floor(segment.text.length / 2) * 11 + (segment.text.length % 2) * 6
  }
  return segment.bytes.length * 8
}

function appendNumericSegment(bitBuffer, text) {
  for (let i = 0; i < text.length; i += 3) {
    const chunk = text.slice(i, i + 3)
    appendBits(bitBuffer, Number(chunk), chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4)
  }
}

function appendAlphanumericSegment(bitBuffer, text) {
  for (let i = 0; i < text.length; i += 2) {
    const first = getAlphanumericValue(text[i])
    if (i + 1 < text.length) {
      appendBits(bitBuffer, first * 45 + getAlphanumericValue(text[i + 1]), 11)
    } else {
      appendBits(bitBuffer, first, 6)
    }
  }
}

function appendByteSegment(bitBuffer, bytes) {
  for (const value of bytes) {
    appendBits(bitBuffer, value, 8)
  }
}

function withEciSegments(segments, options = {}) {
  const shouldUseEci = options.eci ?? true
  if (!shouldUseEci) {
    return segments
  }

  const result = []
  let currentEncoding = null
  for (const segment of segments) {
    if (segment.mode === 'byte' && segment.encoding && segment.encoding !== currentEncoding) {
      result.push(createEciSegment(segment.encoding))
      currentEncoding = segment.encoding
    }
    result.push(segment)
  }
  return result
}

function createEciSegment(encoding) {
  const normalized = normalizeEncoding(encoding)
  return {
    mode: 'eci',
    assignmentNumber: ECI_ASSIGNMENT_NUMBERS[normalized],
  }
}

function appendEciAssignmentNumber(bitBuffer, assignmentNumber) {
  if (assignmentNumber < 0x80) {
    appendBits(bitBuffer, assignmentNumber, 8)
  } else if (assignmentNumber < 0x4000) {
    appendBits(bitBuffer, 0x8000 | assignmentNumber, 16)
  } else if (assignmentNumber < 1000000) {
    appendBits(bitBuffer, 0xc00000 | assignmentNumber, 24)
  } else {
    throw new Error(`Unsupported ECI assignment number: ${assignmentNumber}`)
  }
}

function getEciAssignmentNumberBitLength(assignmentNumber) {
  if (assignmentNumber < 0x80) return 8
  if (assignmentNumber < 0x4000) return 16
  if (assignmentNumber < 1000000) return 24
  throw new Error(`Unsupported ECI assignment number: ${assignmentNumber}`)
}

function normalizeByteSegmentBytes(text, options) {
  if (options.bytes !== undefined) {
    if (!options.bytes || typeof options.bytes[Symbol.iterator] !== 'function') {
      throw new Error('Byte QR segment bytes must be iterable.')
    }
    return Array.from(options.bytes, (value) => {
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(`Invalid byte value for QR byte segment: ${value}`)
      }
      return value
    })
  }

  return encodeText(text, options.encoding)
}

function encodeText(text, encoding = DEFAULT_ENCODING) {
  const normalized = normalizeEncoding(encoding)
  if (normalized === 'utf-8') {
    return Array.from(encoder.encode(text))
  }

  const bytes = []
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (normalized === 'iso-8859-1') {
      if (codePoint > 0xff) {
        throw new Error(`Character "${char}" cannot be encoded as ISO-8859-1.`)
      }
      bytes.push(codePoint)
    } else if (normalized === 'windows-1252') {
      if (codePoint <= 0x7f || (codePoint >= 0xa0 && codePoint <= 0xff)) {
        bytes.push(codePoint)
      } else if (WINDOWS_1252_EXTENSIONS.has(codePoint)) {
        bytes.push(WINDOWS_1252_EXTENSIONS.get(codePoint))
      } else {
        throw new Error(`Character "${char}" cannot be encoded as Windows-1252.`)
      }
    }
  }
  return bytes
}

function normalizeMode(mode, allowAuto = true) {
  const normalized = String(mode ?? 'auto').toLowerCase()
  const supported = allowAuto ? ['auto', 'byte', 'numeric', 'alphanumeric'] : ['byte', 'numeric', 'alphanumeric']
  if (!supported.includes(normalized)) {
    throw new Error(`Unsupported QR segment mode: ${mode}`)
  }
  return normalized
}

function normalizeEncoding(encoding = DEFAULT_ENCODING) {
  const normalized = String(encoding ?? DEFAULT_ENCODING).toLowerCase().replaceAll('_', '-')
  if (normalized === 'utf8') {
    return 'utf-8'
  }
  if (normalized === 'latin1' || normalized === 'latin-1' || normalized === 'iso8859-1') {
    return 'iso-8859-1'
  }
  if (normalized === 'cp1252' || normalized === 'windows1252') {
    return 'windows-1252'
  }
  if (!['utf-8', 'iso-8859-1', 'windows-1252'].includes(normalized)) {
    throw new Error(`Unsupported QR byte encoding: ${encoding}`)
  }
  return normalized
}

function getAlphanumericValue(char) {
  return ALPHANUMERIC_CHARSET.indexOf(char)
}

function isNumeric(text) {
  return /^[0-9]+$/.test(text)
}

function isAlphanumeric(text) {
  return /^[0-9A-Z $%*+\-./:]+$/.test(text)
}

function drawFunctionPatterns(modules, isFunction, version) {
  const size = modules.length
  drawFinderPattern(modules, isFunction, 3, 3)
  drawFinderPattern(modules, isFunction, size - 4, 3)
  drawFinderPattern(modules, isFunction, 3, size - 4)

  for (let i = 0; i < size; i += 1) {
    if (!isFunction[6][i]) {
      setFunctionModule(modules, isFunction, i, 6, i % 2 === 0)
    }
    if (!isFunction[i][6]) {
      setFunctionModule(modules, isFunction, 6, i, i % 2 === 0)
    }
  }

  const alignmentPatternPositions = getAlignmentPatternPositions(version)
  for (const row of alignmentPatternPositions) {
    for (const column of alignmentPatternPositions) {
      const overlapsFinder =
        (row === 6 && column === 6) ||
        (row === 6 && column === size - 7) ||
        (row === size - 7 && column === 6)

      if (!overlapsFinder) {
        drawAlignmentPattern(modules, isFunction, column, row)
      }
    }
  }

  setFunctionModule(modules, isFunction, 8, size - 8, true)

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      setFunctionModule(modules, isFunction, 8, i, false)
      setFunctionModule(modules, isFunction, i, 8, false)
    }
  }
  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(modules, isFunction, size - 1 - i, 8, false)
    if (i < 7) {
      setFunctionModule(modules, isFunction, 8, size - 1 - i, false)
    }
  }

  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        setFunctionModule(modules, isFunction, size - 11 + j, i, false)
        setFunctionModule(modules, isFunction, i, size - 11 + j, false)
      }
    }
  }
}

function drawFinderPattern(modules, isFunction, centerX, centerY) {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const x = centerX + dx
      const y = centerY + dy
      if (x >= 0 && x < modules.length && y >= 0 && y < modules.length) {
        const maxDistance = Math.max(Math.abs(dx), Math.abs(dy))
        setFunctionModule(modules, isFunction, x, y, maxDistance !== 2 && maxDistance !== 4)
      }
    }
  }
}

function drawAlignmentPattern(modules, isFunction, centerX, centerY) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      setFunctionModule(modules, isFunction, centerX + dx, centerY + dy, distance !== 1)
    }
  }
}

function getAlignmentPatternPositions(version) {
  return ALIGNMENT_PATTERN_POSITIONS[version] ?? []
}

function drawCodewords(modules, isFunction, codewords) {
  const bits = []
  for (const codeword of codewords) {
    appendBits(bits, codeword, 8)
  }

  let bitIndex = 0
  const size = modules.length
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1
    }
    for (let verticalIndex = 0; verticalIndex < size; verticalIndex += 1) {
      const upward = ((right + 1) & 2) === 0
      const y = upward ? size - 1 - verticalIndex : verticalIndex
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx
        if (!isFunction[y][x] && bitIndex < bits.length) {
          modules[y][x] = bits[bitIndex] === 1
          bitIndex += 1
        }
      }
    }
  }
}

function applyMask(modules, isFunction, mask) {
  for (let y = 0; y < modules.length; y += 1) {
    for (let x = 0; x < modules.length; x += 1) {
      if (!isFunction[y][x] && getMaskValue(mask, x, y)) {
        modules[y][x] = !modules[y][x]
      }
    }
  }
}

function getMaskValue(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0
    case 1: return y % 2 === 0
    case 2: return x % 3 === 0
    case 3: return (x + y) % 3 === 0
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
    default: throw new Error(`Unsupported mask pattern: ${mask}`)
  }
}

function drawFormatBits(modules, isFunction, ecl, mask) {
  const size = modules.length
  const data = (ECC_LEVELS[ecl].formatBits << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537)
  }
  const bits = ((data << 10) | rem) ^ 0x5412

  for (let i = 0; i <= 5; i += 1) {
    setFunctionModule(modules, isFunction, 8, i, getBit(bits, i))
  }
  setFunctionModule(modules, isFunction, 8, 7, getBit(bits, 6))
  setFunctionModule(modules, isFunction, 8, 8, getBit(bits, 7))
  setFunctionModule(modules, isFunction, 7, 8, getBit(bits, 8))
  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(modules, isFunction, 14 - i, 8, getBit(bits, i))
  }
  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(modules, isFunction, size - 1 - i, 8, getBit(bits, i))
  }
  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(modules, isFunction, 8, size - 15 + i, getBit(bits, i))
  }
  setFunctionModule(modules, isFunction, 8, size - 8, true)
}

function drawVersionBits(modules, isFunction, version) {
  let rem = version
  for (let i = 0; i < 12; i += 1) {
    rem = (rem << 1) ^ (((rem >>> 11) & 1) * 0x1f25)
  }
  const bits = (version << 12) | rem
  const size = modules.length

  for (let i = 0; i < 18; i += 1) {
    const bit = getBit(bits, i)
    const a = size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    setFunctionModule(modules, isFunction, a, b, bit)
    setFunctionModule(modules, isFunction, b, a, bit)
  }
}

function getPenaltyScore(modules) {
  const size = modules.length
  let penalty = 0

  for (let y = 0; y < size; y += 1) {
    let runColor = false
    let runLength = 0
    for (let x = 0; x < size; x += 1) {
      const color = modules[y][x]
      if (x === 0 || color !== runColor) {
        runColor = color
        runLength = 1
      } else {
        runLength += 1
        penalty += runLength === 5 ? 3 : runLength > 5 ? 1 : 0
      }
    }
  }

  for (let x = 0; x < size; x += 1) {
    let runColor = false
    let runLength = 0
    for (let y = 0; y < size; y += 1) {
      const color = modules[y][x]
      if (y === 0 || color !== runColor) {
        runColor = color
        runLength = 1
      } else {
        runLength += 1
        penalty += runLength === 5 ? 3 : runLength > 5 ? 1 : 0
      }
    }
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x]
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) {
        penalty += 3
      }
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size - 10; x += 1) {
      if (matchesPatternLine((index) => modules[y][x + index])) {
        penalty += 40
      }
    }
  }

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size - 10; y += 1) {
      if (matchesPatternLine((index) => modules[y + index][x])) {
        penalty += 40
      }
    }
  }

  let darkModules = 0
  for (const row of modules) {
    for (const module of row) {
      if (module) {
        darkModules += 1
      }
    }
  }

  const percentage = (darkModules * 100) / (size * size)
  penalty += Math.floor(Math.abs(percentage - 50) / 5) * 10

  return penalty
}

function matchesPatternLine(getValue) {
  const a = [true, false, true, true, true, false, true, false, false, false, false]
  const b = [false, false, false, false, true, false, true, true, true, false, true]
  return a.every((value, index) => getValue(index) === value) || b.every((value, index) => getValue(index) === value)
}

function reedSolomonRemainder(data, degree) {
  const divisor = reedSolomonGenerator(degree)
  const result = new Array(degree).fill(0)

  for (const value of data) {
    const factor = value ^ result.shift()
    result.push(0)
    divisor.forEach((coefficient, index) => {
      result[index] ^= multiplyFiniteField(coefficient, factor)
    })
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
  
  // FIX: Wir entfernen die führende 1 (höchste Potenz) am Ende des Arrays 
  // und drehen das Array um, damit wir von x^(n-1) bis x^0 absteigen.
  result.pop()
  return result.reverse()
}

function multiplyFiniteField(x, y) {
  let z = 0
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    if (((y >>> i) & 1) !== 0) {
      z ^= x
    }
  }
  return z
}

function appendBits(bitBuffer, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bitBuffer.push((value >>> i) & 1)
  }
}

function setFunctionModule(modules, isFunction, x, y, value) {
  modules[y][x] = value
  isFunction[y][x] = true
}

function getBit(value, index) {
  return ((value >>> index) & 1) !== 0
}

function createSquareArray(size, initialValue) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => initialValue))
}

function cloneMatrix(modules) {
  return modules.map((row) => row.slice())
}
