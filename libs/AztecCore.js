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

    // Current scope:
    // 1) simple binary payload sizing
    // 2) layer selection + compact/full decision
    // Next steps:
    // 3) RS error correction word generation
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
      eccBits: layerPlan.eccBits,
      codewordSize: layerPlan.wordSize,
      capacityBits: layerPlan.capacityBits,
      usableBits: layerPlan.usableBits,
      readyForScan: false,
      modules: [],
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
