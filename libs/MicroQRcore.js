// ==========================================
// MicroQRcore.js - Foundation for Micro QR (ISO/IEC 18004 Annex M)
// Dependency-free, plain JavaScript
// ==========================================

const MICRO_SYMBOLS = [
  { version: 'M1', size: 11, ecl: ['NONE'], capacity: { numeric: 5, alphanumeric: 0, byte: 0 } },
  { version: 'M2', size: 13, ecl: ['L', 'M'], capacity: { numeric: 10, alphanumeric: 6, byte: 0 } },
  { version: 'M3', size: 15, ecl: ['L', 'M'], capacity: { numeric: 23, alphanumeric: 14, byte: 9 } },
  { version: 'M4', size: 17, ecl: ['L', 'M', 'Q'], capacity: { numeric: 35, alphanumeric: 21, byte: 15 } },
]

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
const textEncoder = new TextEncoder()

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
      ...options,
    }
  }

  generate() {
    const mode = chooseMode(this.data, this.options.preferredMode)
    const minIndex = versionToIndex(this.options.minVersion)
    const maxIndex = versionToIndex(this.options.maxVersion)
    if (minIndex > maxIndex) {
      throw new Error('minVersion must be less than or equal to maxVersion.')
    }

    const symbol = chooseSymbol(this.data, mode, this.options.errorCorrectionLevel, minIndex, maxIndex)
    const encodedBits = encodeByMode(this.data, mode)
    const modules = drawMicroFunctionMatrix(symbol.size)

    return {
      format: 'microqr',
      data: this.data,
      version: symbol.version,
      size: symbol.size,
      errorCorrectionLevel: symbol.ecl,
      mode,
      capacity: symbol.capacity,
      encodedBits,
      // Note: ECC + final Annex-M placement will be added in next step.
      modules,
      readyForScan: false,
    }
  }
}

function chooseMode(data, preferredMode) {
  const mode = String(preferredMode || 'auto').toLowerCase()
  if (mode === 'numeric') {
    ensureNumeric(data)
    return 'numeric'
  }
  if (mode === 'alphanumeric') {
    ensureAlphanumeric(data)
    return 'alphanumeric'
  }
  if (mode === 'byte') {
    ensureByte(data)
    return 'byte'
  }
  if (mode !== 'auto') {
    throw new Error(`Unsupported preferredMode: ${preferredMode}`)
  }

  if (isNumeric(data)) return 'numeric'
  if (isAlphanumeric(data)) return 'alphanumeric'
  return 'byte'
}

function chooseSymbol(data, mode, preferredEcl, minIndex, maxIndex) {
  const dataLengthByMode = getLogicalDataLength(data, mode)
  const normalizedPreferred = String(preferredEcl || 'auto').toUpperCase()
  const preferredIsAuto = normalizedPreferred === 'AUTO'

  for (let i = minIndex; i <= maxIndex; i += 1) {
    const candidate = MICRO_SYMBOLS[i]
    if (candidate.capacity[mode] <= 0 || dataLengthByMode > candidate.capacity[mode]) {
      continue
    }

    if (!preferredIsAuto) {
      if (candidate.ecl.includes(normalizedPreferred)) {
        return {
          ...candidate,
          ecl: normalizedPreferred,
        }
      }
      continue
    }

    return {
      ...candidate,
      ecl: candidate.ecl[candidate.ecl.length - 1],
    }
  }

  throw new Error(`Input exceeds Micro QR capacity for mode "${mode}" in selected version range.`)
}

function getLogicalDataLength(data, mode) {
  if (mode === 'byte') {
    return textEncoder.encode(data).length
  }
  return data.length
}

function encodeByMode(data, mode) {
  if (mode === 'numeric') return encodeNumeric(data)
  if (mode === 'alphanumeric') return encodeAlphanumeric(data)
  return encodeByte(data)
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

function encodeByte(data) {
  ensureByte(data)
  const bits = []
  const bytes = textEncoder.encode(data)
  for (const value of bytes) {
    appendBits(bits, value, 8)
  }
  return bits
}

function drawMicroFunctionMatrix(size) {
  const modules = createSquareArray(size, null)
  const isFunction = createSquareArray(size, false)

  drawFinderPattern(modules, isFunction, 3, 3)
  drawTimingPatterns(modules, isFunction)
  reserveFormatArea(modules, isFunction)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules[y][x] == null) {
        modules[y][x] = false
      }
    }
  }

  return modules
}

function drawFinderPattern(modules, isFunction, centerX, centerY) {
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const x = centerX + dx
      const y = centerY + dy
      if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) continue
      const maxDistance = Math.max(Math.abs(dx), Math.abs(dy))
      const dark = maxDistance !== 2
      modules[y][x] = dark
      isFunction[y][x] = true
    }
  }
}

function drawTimingPatterns(modules, isFunction) {
  const size = modules.length
  for (let x = 0; x < size; x += 1) {
    if (!isFunction[0][x]) {
      modules[0][x] = x % 2 === 0
      isFunction[0][x] = true
    }
  }
  for (let y = 0; y < size; y += 1) {
    if (!isFunction[y][0]) {
      modules[y][0] = y % 2 === 0
      isFunction[y][0] = true
    }
  }
}

function reserveFormatArea(modules, isFunction) {
  const size = modules.length
  for (let i = 1; i <= 8 && i < size; i += 1) {
    if (!isFunction[8] || i >= size) break
    if (!isFunction[8][i]) {
      modules[8][i] = false
      isFunction[8][i] = true
    }
  }
  for (let i = 1; i <= 8 && i < size; i += 1) {
    if (!isFunction[i][8]) {
      modules[i][8] = false
      isFunction[i][8] = true
    }
  }
}

function appendBits(bitBuffer, value, bitLength) {
  for (let i = bitLength - 1; i >= 0; i -= 1) {
    bitBuffer.push((value >>> i) & 1)
  }
}

function ensureNumeric(data) {
  if (!isNumeric(data)) {
    throw new Error('Data contains non-numeric characters.')
  }
}

function ensureAlphanumeric(data) {
  if (!isAlphanumeric(data)) {
    throw new Error('Data contains non-alphanumeric characters for Micro QR alphanumeric mode.')
  }
}

function ensureByte(data) {
  const bytes = textEncoder.encode(data)
  if (bytes.length === 0) {
    throw new Error('Byte mode data is empty.')
  }
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
  const index = MICRO_SYMBOLS.findIndex((symbol) => symbol.version === normalized)
  if (index < 0) {
    throw new Error(`Unsupported Micro QR version: ${version}`)
  }
  return index
}

function createSquareArray(size, initialValue) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => initialValue))
}
