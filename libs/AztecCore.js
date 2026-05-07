// ==========================================
// AztecCore.js - Dependency-free Aztec Code generator (foundation)
// ==========================================

const DEFAULT_OPTIONS = {
  // auto => choose compact/full + layers by payload size
  mode: 'auto', // auto|compact|full
  minLayers: 1,
  maxLayers: 32,
  errorCorrectionPercent: 23,
}

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
    const payloadBits = payloadBytes.length * 8
    const layerPlan = chooseLayerPlan(payloadBits, normalized)
    const stuffedBits = bitStuff(payloadBytes, layerPlan.wordSize)
    const messageWords = bitsToWords(stuffedBits, layerPlan.wordSize)
    const totalWords = Math.floor(layerPlan.usableBits / layerPlan.wordSize)
    const eccWords = totalWords - messageWords.length
    if (eccWords <= 0) {
      throw new Error('Aztec planning produced non-positive ECC word count.')
    }
    const checkWords = reedSolomonCheckWords(messageWords, eccWords, layerPlan.wordSize)
    const { modules, isFunction } = buildSymbolScaffold(layerPlan.layers, layerPlan.compact)

    // Current scope:
    // 1) simple binary payload sizing
    // 2) layer selection + compact/full decision
    // Next steps:
    // 3) mode message + bullseye + data ring placement
    // 4) mode message + bullseye + data ring placement
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
      eccBits: layerPlan.eccBits,
      codewordSize: layerPlan.wordSize,
      capacityBits: layerPlan.capacityBits,
      usableBits: layerPlan.usableBits,
      readyForScan: false,
      modules,
      isFunction,
      size: layerPlan.size,
      layers: layerPlan.layers,
      compact: layerPlan.compact,
    }
  }
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

function chooseLayerPlan(payloadBits, options) {
  const eccBits = Math.max(11, Math.ceil((payloadBits * options.errorCorrectionPercent) / 100))
  const requiredBits = payloadBits + eccBits
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

  const candidates = options.mode === 'auto' ? [...tryCompactFirst, ...tryFullAfter] : options.mode === 'compact' ? tryCompactFirst : tryFullAfter

  for (const candidate of candidates) {
    const wordSize = getAztecWordSize(candidate.layers)
    const capacityBits = totalBitsInLayer(candidate.layers, candidate.compact)
    const usableBits = capacityBits - (capacityBits % wordSize)
    if (requiredBits <= usableBits) {
      return {
        layers: candidate.layers,
        compact: candidate.compact,
        wordSize,
        capacityBits,
        usableBits,
        eccBits,
        size: candidate.compact ? 11 + 4 * candidate.layers : 15 + 4 * candidate.layers,
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

function buildSymbolScaffold(layers, compact) {
  const size = compact ? 11 + 4 * layers : 15 + 4 * layers
  const modules = createSquare(size, false)
  const isFunction = createSquare(size, false)
  const center = Math.floor(size / 2)

  drawBullsEye(modules, isFunction, center, compact ? 5 : 7)
  if (!compact) {
    drawReferenceGrid(modules, isFunction, center)
  }

  return { modules, isFunction }
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

function drawReferenceGrid(modules, isFunction, center) {
  const size = modules.length
  for (let offset = 0; center - offset >= 0; offset += 16) {
    const x1 = center - offset
    const x2 = center + offset
    if (x1 >= 0) {
      for (let i = 0; i < size; i += 1) {
        const bit = (i & 1) === 0
        setFunction(modules, isFunction, x1, i, bit)
        setFunction(modules, isFunction, i, x1, bit)
      }
    }
    if (x2 < size && offset !== 0) {
      for (let i = 0; i < size; i += 1) {
        const bit = (i & 1) === 0
        setFunction(modules, isFunction, x2, i, bit)
        setFunction(modules, isFunction, i, x2, bit)
      }
    }
  }
}

function bitStuff(bytes, wordSize) {
  const bits = []
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >>> i) & 1)
  }

  const out = []
  const allOnes = (1 << wordSize) - 1
  const allZeros = 0
  let value = 0
  let n = 0

  for (const bit of bits) {
    value = (value << 1) | bit
    n += 1
    if (n === wordSize) {
      if (value === allOnes) {
        out.push(...toBits(value ^ 1, wordSize))
      } else if (value === allZeros) {
        out.push(...toBits(1, wordSize))
      } else {
        out.push(...toBits(value, wordSize))
      }
      value = 0
      n = 0
    }
  }
  if (n > 0) {
    value <<= (wordSize - n)
    out.push(...toBits(value, wordSize))
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
    const term = [1, gf.expTable[d]]
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
    6: { primitive: 0x43, size: 64 },
    8: { primitive: 0x12d, size: 256 },
    10: { primitive: 0x409, size: 1024 },
    12: { primitive: 0x1069, size: 4096 },
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

function createSquare(size, value) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value))
}

function setFunction(modules, isFunction, x, y, value) {
  if (y < 0 || y >= modules.length || x < 0 || x >= modules.length) return
  modules[y][x] = value
  isFunction[y][x] = true
}
