// ==========================================
// AztecCore.js - Dependency-free Aztec Code generator
// ==========================================

const DEFAULT_OPTIONS = {
  // auto => choose compact/full + layers by payload size
  mode: 'auto', // auto|compact|full
  minLayers: 1,
  maxLayers: 32,
  errorCorrectionPercent: 33,
}

const MODE_UPPER = 0
const MODE_LOWER = 1
const MODE_DIGIT = 2
const MODE_MIXED = 3
const MODE_PUNCT = 4

const LATCH_TABLE = [
  [0, (5 << 16) | 28, (5 << 16) | 30, (5 << 16) | 29, (10 << 16) | (29 << 5) | 30],
  [(9 << 16) | (30 << 4) | 14, 0, (5 << 16) | 30, (5 << 16) | 29, (10 << 16) | (29 << 5) | 30],
  [(4 << 16) | 14, (9 << 16) | (14 << 5) | 28, 0, (9 << 16) | (14 << 5) | 29, (14 << 16) | (14 << 10) | (29 << 5) | 30],
  [(5 << 16) | 29, (5 << 16) | 28, (10 << 16) | (29 << 5) | 30, 0, (5 << 16) | 30],
  [(5 << 16) | 31, (10 << 16) | (31 << 5) | 28, (10 << 16) | (31 << 5) | 30, (10 << 16) | (31 << 5) | 29, 0],
]

const SHIFT_TABLE = Array.from({ length: 5 }, () => new Array(5).fill(-1))
SHIFT_TABLE[MODE_UPPER][MODE_PUNCT] = 0
SHIFT_TABLE[MODE_LOWER][MODE_PUNCT] = 0
SHIFT_TABLE[MODE_LOWER][MODE_UPPER] = 28
SHIFT_TABLE[MODE_MIXED][MODE_PUNCT] = 0
SHIFT_TABLE[MODE_DIGIT][MODE_PUNCT] = 0
SHIFT_TABLE[MODE_DIGIT][MODE_UPPER] = 15

const CHAR_MAP = createAztecCharMap()

export class AztecCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Aztec data must be a non-empty string.')
    }

    this.data = data
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  generate() {
    const normalized = normalizeOptions(this.options)
    const payloadBytes = encodeUtf8Bytes(this.data)
    const payloadBitsArray = encodeHighLevelBits(payloadBytes)
    const payloadBits = payloadBitsArray.length
    const layerPlan = chooseLayerPlan(payloadBitsArray, normalized)
    const stuffedBits = layerPlan.stuffedBits
    const messageWords = bitsToWords(stuffedBits, layerPlan.wordSize)
    const totalWords = Math.floor(layerPlan.usableBits / layerPlan.wordSize)
    const eccWords = totalWords - messageWords.length
    if (eccWords <= 0) {
      throw new Error('Aztec planning produced non-positive ECC word count.')
    }
    const checkWords = reedSolomonCheckWords(messageWords, eccWords, layerPlan.wordSize)
    const messageBits = generateCheckWordsFromBits(stuffedBits, layerPlan.capacityBits, layerPlan.wordSize)
    const modeMessageBits = generateModeMessage(layerPlan.compact, layerPlan.layers, messageWords.length)
    const { modules, isFunction, matrixSize } = buildAztecMatrix(layerPlan, messageBits, modeMessageBits)

    const actualEccBits = checkWords.length * layerPlan.wordSize
    const actualErrorCorrectionPercent = (actualEccBits * 100) / payloadBits

    return {
      format: 'aztec',
      data: this.data,
      mode: normalized.mode,
      minLayers: normalized.minLayers,
      maxLayers: normalized.maxLayers,
      errorCorrectionPercent: normalized.errorCorrectionPercent,
      payloadBytes,
      payloadBits,
      stuffedBits,
      messageWords,
      checkWords,
      modeMessageBits,
      placedDataBits: messageBits.length,
      minimumEccBits: layerPlan.minimumEccBits,
      eccBits: actualEccBits,
      actualErrorCorrectionPercent,
      codewordSize: layerPlan.wordSize,
      capacityBits: layerPlan.capacityBits,
      usableBits: layerPlan.usableBits,
      readyForScan: true,
      modules,
      isFunction,
      size: matrixSize,
      layers: layerPlan.layers,
      compact: layerPlan.compact,
    }
  }
}

// Shared low-level construction used by the separate Aztec Rune public API.
// ISO/IEC 24778:2008 Annex A encodes two data words and five check words in GF(16),
// complements every even-positioned mode bit, and places them around the compact bullseye.
export function buildAztecRuneMatrix(value) {
  const dataWords = [value >>> 4, value & 0x0f]
  const checkWords = reedSolomonCheckWords(dataWords, 5, 4)
  const modeMessageBits = wordsToBits([...dataWords, ...checkWords], 4)
  for (let i = 0; i < modeMessageBits.length; i += 2) modeMessageBits[i] ^= 1

  const size = 11
  const modules = createSquare(size, false)
  const isFunction = createSquare(size, false)
  drawModeMessage(modules, isFunction, true, size, modeMessageBits)
  drawBullsEye(modules, isFunction, 5, 5)
  return { modules, isFunction, size, dataWords, checkWords, modeMessageBits }
}

function normalizeOptions(options) {
  const mode = String(options.mode ?? 'auto').toLowerCase()
  if (!['auto', 'compact', 'full'].includes(mode)) {
    throw new Error(`Unsupported Aztec mode: ${options.mode}`)
  }

  const minLayers = Number(options.minLayers)
  const maxLayers = Number(options.maxLayers)
  if (!Number.isInteger(minLayers) || !Number.isInteger(maxLayers)) {
    throw new Error('minLayers and maxLayers must be integers.')
  }
  if (minLayers < 1 || maxLayers < 1 || minLayers > 32 || maxLayers > 32) {
    throw new Error('Aztec layer bounds must be between 1 and 32.')
  }
  if (minLayers > maxLayers) {
    throw new Error('minLayers must be less than or equal to maxLayers.')
  }

  const ec = Number(options.errorCorrectionPercent)
  if (!Number.isFinite(ec) || ec < 5 || ec > 95) {
    throw new Error('errorCorrectionPercent must be between 5 and 95.')
  }

  return {
    mode,
    minLayers,
    maxLayers,
    errorCorrectionPercent: ec,
  }
}

function encodeUtf8Bytes(data) {
  return Array.from(new TextEncoder().encode(data))
}

function createAztecCharMap() {
  const maps = Array.from({ length: 5 }, () => new Array(256).fill(0))

  maps[MODE_UPPER][32] = 1
  maps[MODE_LOWER][32] = 1
  maps[MODE_DIGIT][32] = 1
  for (let value = 0; value < 26; value += 1) {
    maps[MODE_UPPER][65 + value] = value + 2
    maps[MODE_LOWER][97 + value] = value + 2
  }
  for (let value = 0; value < 10; value += 1) {
    maps[MODE_DIGIT][48 + value] = value + 2
  }
  maps[MODE_DIGIT][44] = 12
  maps[MODE_DIGIT][46] = 13

  const mixed = [
    0, 32, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    27, 28, 29, 30, 31, 64, 92, 94, 95, 96, 124, 126, 127,
  ]
  const punct = [
    0, 13, 0, 0, 0, 0, 33, 39, 35, 36, 37, 38, 39, 40, 41, 42,
    43, 44, 45, 46, 47, 58, 59, 60, 61, 62, 63, 91, 93, 123, 125,
  ]
  mixed.forEach((character, value) => {
    if (character !== 0) maps[MODE_MIXED][character] = value
  })
  punct.forEach((character, value) => {
    if (character !== 0) maps[MODE_PUNCT][character] = value
  })
  return maps
}

function encodeHighLevelBits(bytes) {
  let states = [{ token: null, mode: MODE_UPPER, binaryShiftByteCount: 0, bitCount: 0 }]

  for (let index = 0; index < bytes.length; index += 1) {
    const current = bytes[index]
    const next = bytes[index + 1]
    const pairCode = current === 13 && next === 10
      ? 2
      : current === 46 && next === 32
        ? 3
        : current === 44 && next === 32
          ? 4
          : current === 58 && next === 32
            ? 5
            : 0

    if (pairCode > 0) {
      states = updateStatesForPair(states, index, pairCode)
      index += 1
    } else {
      states = updateStatesForCharacter(states, bytes, index)
    }
  }

  const best = states.reduce((shortest, state) => state.bitCount < shortest.bitCount ? state : shortest)
  return stateToBits(endBinaryShift(best, bytes.length), bytes)
}

function updateStatesForCharacter(states, bytes, index) {
  const result = []
  for (const state of states) {
    const character = bytes[index] & 0xff
    const inCurrentMode = CHAR_MAP[state.mode][character] > 0
    let stateWithoutBinary = null

    for (let mode = MODE_UPPER; mode <= MODE_PUNCT; mode += 1) {
      const value = CHAR_MAP[mode][character]
      if (value === 0) continue
      stateWithoutBinary ??= endBinaryShift(state, index)

      if (!inCurrentMode || mode === state.mode || mode === MODE_DIGIT) {
        result.push(latchAndAppend(stateWithoutBinary, mode, value))
      }
      if (!inCurrentMode && SHIFT_TABLE[state.mode][mode] >= 0) {
        result.push(shiftAndAppend(stateWithoutBinary, mode, value))
      }
    }

    if (state.binaryShiftByteCount > 0 || !inCurrentMode) {
      result.push(addBinaryShiftCharacter(state, index))
    }
  }
  return simplifyStates(result)
}

function updateStatesForPair(states, index, pairCode) {
  const result = []
  for (const state of states) {
    const stateWithoutBinary = endBinaryShift(state, index)
    result.push(latchAndAppend(stateWithoutBinary, MODE_PUNCT, pairCode))
    if (state.mode !== MODE_PUNCT) {
      result.push(shiftAndAppend(stateWithoutBinary, MODE_PUNCT, pairCode))
    }
    if (pairCode === 3 || pairCode === 4) {
      const digitState = latchAndAppend(stateWithoutBinary, MODE_DIGIT, 16 - pairCode)
      result.push(latchAndAppend(digitState, MODE_DIGIT, 1))
    }
    if (state.binaryShiftByteCount > 0) {
      result.push(addBinaryShiftCharacter(addBinaryShiftCharacter(state, index), index + 1))
    }
  }
  return simplifyStates(result)
}

function latchAndAppend(state, mode, value) {
  let token = state.token
  let bitCount = state.bitCount
  if (mode !== state.mode) {
    const latch = LATCH_TABLE[state.mode][mode]
    const latchBits = latch >>> 16
    token = addSimpleToken(token, latch & 0xffff, latchBits)
    bitCount += latchBits
  }
  const characterBits = mode === MODE_DIGIT ? 4 : 5
  token = addSimpleToken(token, value, characterBits)
  return { token, mode, binaryShiftByteCount: 0, bitCount: bitCount + characterBits }
}

function shiftAndAppend(state, mode, value) {
  const shiftBits = state.mode === MODE_DIGIT ? 4 : 5
  let token = addSimpleToken(state.token, SHIFT_TABLE[state.mode][mode], shiftBits)
  token = addSimpleToken(token, value, 5)
  return {
    token,
    mode: state.mode,
    binaryShiftByteCount: 0,
    bitCount: state.bitCount + shiftBits + 5,
  }
}

function addBinaryShiftCharacter(state, index) {
  let token = state.token
  let mode = state.mode
  let bitCount = state.bitCount
  if (mode === MODE_PUNCT || mode === MODE_DIGIT) {
    const latch = LATCH_TABLE[mode][MODE_UPPER]
    const latchBits = latch >>> 16
    token = addSimpleToken(token, latch & 0xffff, latchBits)
    bitCount += latchBits
    mode = MODE_UPPER
  }

  const count = state.binaryShiftByteCount
  const additionalBits = count === 0 || count === 31 ? 18 : count === 62 ? 9 : 8
  let result = {
    token,
    mode,
    binaryShiftByteCount: count + 1,
    bitCount: bitCount + additionalBits,
  }
  if (result.binaryShiftByteCount === 2078) {
    result = endBinaryShift(result, index + 1)
  }
  return result
}

function endBinaryShift(state, index) {
  if (state.binaryShiftByteCount === 0) return state
  return {
    token: {
      previous: state.token,
      type: 'binary',
      start: index - state.binaryShiftByteCount,
      count: state.binaryShiftByteCount,
    },
    mode: state.mode,
    binaryShiftByteCount: 0,
    bitCount: state.bitCount,
  }
}

function addSimpleToken(previous, value, bitCount) {
  return { previous, type: 'simple', value, bitCount }
}

function binaryShiftCost(state) {
  if (state.binaryShiftByteCount > 62) return 21
  if (state.binaryShiftByteCount > 31) return 20
  if (state.binaryShiftByteCount > 0) return 10
  return 0
}

function isBetterThanOrEqualTo(state, other) {
  let projectedBits = state.bitCount + (LATCH_TABLE[state.mode][other.mode] >>> 16)
  if (state.binaryShiftByteCount < other.binaryShiftByteCount) {
    projectedBits += binaryShiftCost(other) - binaryShiftCost(state)
  } else if (state.binaryShiftByteCount > other.binaryShiftByteCount && other.binaryShiftByteCount > 0) {
    projectedBits += 10
  }
  return projectedBits <= other.bitCount
}

function simplifyStates(states) {
  const result = []
  for (const candidate of states) {
    let keep = true
    for (let index = result.length - 1; index >= 0; index -= 1) {
      const existing = result[index]
      if (isBetterThanOrEqualTo(existing, candidate)) {
        keep = false
        break
      }
      if (isBetterThanOrEqualTo(candidate, existing)) {
        result.splice(index, 1)
      }
    }
    if (keep) result.push(candidate)
  }
  return result
}

function stateToBits(state, bytes) {
  const tokens = []
  for (let token = state.token; token !== null; token = token.previous) {
    tokens.unshift(token)
  }

  const bits = []
  for (const token of tokens) {
    if (token.type === 'simple') {
      bits.push(...toBits(token.value, token.bitCount))
      continue
    }
    for (let offset = 0; offset < token.count; offset += 1) {
      if (offset === 0 || (offset === 31 && token.count <= 62)) {
        bits.push(...toBits(31, 5))
        if (token.count > 62) {
          bits.push(...toBits(token.count - 31, 16))
        } else if (offset === 0) {
          bits.push(...toBits(Math.min(token.count, 31), 5))
        } else {
          bits.push(...toBits(token.count - 31, 5))
        }
      }
      bits.push(...toBits(bytes[token.start + offset], 8))
    }
  }
  return bits
}

function chooseLayerPlan(payloadBits, options) {
  const minimumEccBits = Math.floor((payloadBits.length * options.errorCorrectionPercent) / 100) + 11
  const compactModeForced = options.mode === 'compact'
  const fullModeForced = options.mode === 'full'

  const tryCompactFirst = []
  const tryFullAfter = []

  for (let layers = options.minLayers; layers <= options.maxLayers; layers += 1) {
    if (layers <= 4 && !fullModeForced) {
      tryCompactFirst.push({ layers, compact: true })
    }
    if (!compactModeForced) {
      tryFullAfter.push({ layers, compact: false })
    }
  }

  const candidates = options.mode === 'auto'
    ? [...tryCompactFirst, ...tryFullAfter]
    : options.mode === 'compact'
      ? tryCompactFirst
      : tryFullAfter

  for (const candidate of candidates) {
    const wordSize = getAztecWordSize(candidate.layers)
    const capacityBits = totalBitsInLayer(candidate.layers, candidate.compact)
    const usableBits = capacityBits - (capacityBits % wordSize)
    if (payloadBits.length + minimumEccBits > capacityBits) {
      continue
    }

    const stuffedBits = bitStuff(payloadBits, wordSize)
    if (candidate.compact && stuffedBits.length > wordSize * 64) {
      continue
    }

    if (stuffedBits.length + minimumEccBits <= usableBits) {
      return {
        layers: candidate.layers,
        compact: candidate.compact,
        wordSize,
        capacityBits,
        usableBits,
        minimumEccBits,
        stuffedBits,
      }
    }
  }

  throw new Error(`Input does not fit Aztec constraints in selected layer range (${options.minLayers}-${options.maxLayers}, mode=${options.mode}).`)
}

function getAztecWordSize(layers) {
  if (layers <= 2) return 6
  if (layers <= 8) return 8
  if (layers <= 22) return 10
  return 12
}

function totalBitsInLayer(layers, compact) {
  // Matches ZXing formula.
  return ((compact ? 88 : 112) + 16 * layers) * layers
}

function drawBullsEye(modules, isFunction, center, size) {
  for (let ring = 0; ring < size; ring += 2) {
    for (let i = center - ring; i <= center + ring; i += 1) {
      setFunction(modules, isFunction, i, center - ring, true)
      setFunction(modules, isFunction, i, center + ring, true)
      setFunction(modules, isFunction, center - ring, i, true)
      setFunction(modules, isFunction, center + ring, i, true)
    }
  }

  // orientation marks (similar structure used by ZXing Aztec drawing)
  setFunction(modules, isFunction, center - size, center - size, true)
  setFunction(modules, isFunction, center - size + 1, center - size, true)
  setFunction(modules, isFunction, center - size, center - size + 1, true)
  setFunction(modules, isFunction, center + size, center - size, true)
  setFunction(modules, isFunction, center + size, center - size + 1, true)
  setFunction(modules, isFunction, center + size, center + size - 1, true)
}

function bitStuff(bits, wordSize) {
  const out = []
  const n = bits.length
  const mask = (1 << wordSize) - 2

  for (let i = 0; i < n; i += wordSize) {
    let word = 0
    for (let j = 0; j < wordSize; j += 1) {
      if (i + j >= n || bits[i + j] === 1) {
        word |= 1 << (wordSize - 1 - j)
      }
    }
    if ((word & mask) === mask) {
      out.push(...toBits(word & mask, wordSize))
      i -= 1
    } else if ((word & mask) === 0) {
      out.push(...toBits(word | 1, wordSize))
      i -= 1
    } else {
      out.push(...toBits(word, wordSize))
    }
  }
  return out
}

function bitsToWords(bits, wordSize) {
  const words = []
  for (let i = 0; i < bits.length; i += wordSize) {
    let value = 0
    for (let j = 0; j < wordSize; j += 1) {
      value = (value << 1) | (bits[i + j] ?? 0)
    }
    words.push(value)
  }
  return words
}

function reedSolomonCheckWords(dataWords, checkWordCount, wordSize) {
  const gf = createGenericGF(wordSize)
  const generator = rsGeneratorPoly(checkWordCount, gf)
  const message = [...dataWords, ...new Array(checkWordCount).fill(0)]

  for (let i = 0; i < dataWords.length; i += 1) {
    const coef = message[i]
    if (coef === 0) continue
    const logCoef = gf.logTable[coef]
    for (let j = 0; j < generator.length; j += 1) {
      const g = generator[j]
      if (g === 0) continue
      const idx = i + j
      const term = gf.expTable[(logCoef + gf.logTable[g]) % (gf.size - 1)]
      message[idx] ^= term
    }
  }

  return message.slice(dataWords.length)
}

function rsGeneratorPoly(degree, gf) {
  let poly = [1]
  for (let d = 0; d < degree; d += 1) {
    const term = [1, gf.expTable[(d + gf.generatorBase) % (gf.size - 1)]]
    poly = polyMultiply(poly, term, gf)
  }
  return poly
}

function polyMultiply(a, b, gf) {
  const out = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (a[i] === 0 || b[j] === 0) continue
      const exp = (gf.logTable[a[i]] + gf.logTable[b[j]]) % (gf.size - 1)
      out[i + j] ^= gf.expTable[exp]
    }
  }
  return out
}

function createGenericGF(wordSize) {
  const config = {
    4: { primitive: 0x13, size: 16, generatorBase: 1 },
    6: { primitive: 0x43, size: 64, generatorBase: 1 },
    8: { primitive: 0x12d, size: 256, generatorBase: 1 },
    10: { primitive: 0x409, size: 1024, generatorBase: 1 },
    12: { primitive: 0x1069, size: 4096, generatorBase: 1 },
  }[wordSize]
  if (!config) throw new Error(`Unsupported Aztec word size: ${wordSize}`)

  const expTable = new Array(config.size)
  const logTable = new Array(config.size)
  let x = 1
  for (let i = 0; i < config.size; i += 1) {
    expTable[i] = x
    x <<= 1
    if (x >= config.size) {
      x ^= config.primitive
      x &= config.size - 1
    }
  }
  for (let i = 0; i < config.size - 1; i += 1) {
    logTable[expTable[i]] = i
  }
  return { ...config, expTable, logTable }
}

function toBits(value, length) {
  const bits = new Array(length)
  for (let i = length - 1; i >= 0; i -= 1) {
    bits[length - 1 - i] = (value >>> i) & 1
  }
  return bits
}

function wordsToBits(words, wordSize) {
  const bits = []
  for (const word of words) {
    bits.push(...toBits(word, wordSize))
  }
  return bits
}

function buildAztecMatrix(layerPlan, messageBits, modeMessageBits) {
  const layers = layerPlan.layers
  const compact = layerPlan.compact
  const baseMatrixSize = (compact ? 11 : 14) + layers * 4
  const alignmentMap = new Array(baseMatrixSize)
  let matrixSize

  if (compact) {
    matrixSize = baseMatrixSize
    for (let i = 0; i < baseMatrixSize; i += 1) alignmentMap[i] = i
  } else {
    matrixSize = baseMatrixSize + 1 + 2 * Math.floor((baseMatrixSize / 2 - 1) / 15)
    const origCenter = Math.floor(baseMatrixSize / 2)
    const center = Math.floor(matrixSize / 2)
    for (let i = 0; i < origCenter; i += 1) {
      const newOffset = i + Math.floor(i / 15)
      alignmentMap[origCenter - i - 1] = center - newOffset - 1
      alignmentMap[origCenter + i] = center + newOffset + 1
    }
  }

  const modules = createSquare(matrixSize, false)
  const isFunction = createSquare(matrixSize, false)

  let rowOffset = 0
  for (let i = 0; i < layers; i += 1) {
    const rowSize = (layers - i) * 4 + (compact ? 9 : 12)
    for (let j = 0; j < rowSize; j += 1) {
      const columnOffset = j * 2
      for (let k = 0; k < 2; k += 1) {
        if (messageBits[rowOffset + columnOffset + k]) {
          modules[alignmentMap[i * 2 + j]][alignmentMap[i * 2 + k]] = true
        }
        if (messageBits[rowOffset + rowSize * 2 + columnOffset + k]) {
          modules[alignmentMap[baseMatrixSize - 1 - i * 2 - k]][alignmentMap[i * 2 + j]] = true
        }
        if (messageBits[rowOffset + rowSize * 4 + columnOffset + k]) {
          modules[alignmentMap[baseMatrixSize - 1 - i * 2 - j]][alignmentMap[baseMatrixSize - 1 - i * 2 - k]] = true
        }
        if (messageBits[rowOffset + rowSize * 6 + columnOffset + k]) {
          modules[alignmentMap[i * 2 + k]][alignmentMap[baseMatrixSize - 1 - i * 2 - j]] = true
        }
      }
    }
    rowOffset += rowSize * 8
  }

  drawModeMessage(modules, isFunction, compact, matrixSize, modeMessageBits)
  if (compact) {
    drawBullsEye(modules, isFunction, Math.floor(matrixSize / 2), 5)
  } else {
    const center = Math.floor(matrixSize / 2)
    drawBullsEye(modules, isFunction, center, 7)
    for (let i = 0, j = 0; i < Math.floor(baseMatrixSize / 2) - 1; i += 15, j += 16) {
      for (let k = center & 1; k < matrixSize; k += 2) {
        setFunction(modules, isFunction, center - j, k, true)
        setFunction(modules, isFunction, center + j, k, true)
        setFunction(modules, isFunction, k, center - j, true)
        setFunction(modules, isFunction, k, center + j, true)
      }
    }
  }

  return { modules, isFunction, matrixSize }
}

function generateModeMessage(compact, layers, messageSizeInWords) {
  const bits = []
  if (compact) {
    bits.push(...toBits(layers - 1, 2))
    bits.push(...toBits(messageSizeInWords - 1, 6))
    return generateCheckWordsFromBits(bits, 28, 4)
  }
  bits.push(...toBits(layers - 1, 5))
  bits.push(...toBits(messageSizeInWords - 1, 11))
  return generateCheckWordsFromBits(bits, 40, 4)
}

function drawModeMessage(modules, isFunction, compact, matrixSize, modeBits) {
  const center = Math.floor(matrixSize / 2)
  if (compact) {
    for (let i = 0; i < 7; i += 1) {
      const offset = center - 3 + i
      setFunction(modules, isFunction, offset, center - 5, modeBits[i] === 1)
      setFunction(modules, isFunction, center + 5, offset, modeBits[i + 7] === 1)
      setFunction(modules, isFunction, offset, center + 5, modeBits[20 - i] === 1)
      setFunction(modules, isFunction, center - 5, offset, modeBits[27 - i] === 1)
    }
  } else {
    for (let i = 0; i < 10; i += 1) {
      const offset = center - 5 + i + Math.floor(i / 5)
      setFunction(modules, isFunction, offset, center - 7, modeBits[i] === 1)
      setFunction(modules, isFunction, center + 7, offset, modeBits[i + 10] === 1)
      setFunction(modules, isFunction, offset, center + 7, modeBits[29 - i] === 1)
      setFunction(modules, isFunction, center - 7, offset, modeBits[39 - i] === 1)
    }
  }
}

function generateCheckWordsFromBits(inputBits, totalBits, wordSize) {
  const messageSizeInWords = Math.floor(inputBits.length / wordSize)
  const totalWords = Math.floor(totalBits / wordSize)
  const messageWords = bitsToWords(inputBits, wordSize)
  while (messageWords.length < totalWords) messageWords.push(0)
  const checkWordCount = totalWords - messageSizeInWords
  const checkWords = reedSolomonCheckWords(messageWords.slice(0, messageSizeInWords), checkWordCount, wordSize)
  const allWords = [...messageWords.slice(0, messageSizeInWords), ...checkWords]
  const startPad = totalBits % wordSize
  const outBits = new Array(startPad).fill(0)
  outBits.push(...wordsToBits(allWords, wordSize))
  return outBits
}

function createSquare(size, value) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value))
}

function setFunction(modules, isFunction, x, y, value) {
  if (y < 0 || y >= modules.length || x < 0 || x >= modules.length) return
  modules[y][x] = value
  isFunction[y][x] = true
}
