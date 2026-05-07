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

    // Foundation return shape for progressive implementation.
    // Next steps:
    // 1) high-level text compaction / binary shift
    // 2) layer selection + capacity fit
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
      readyForScan: false,
      modules: [],
      size: 0,
      layers: 0,
      compact: false,
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
