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
  5: {
    L: [[1, 134, 108]],
    M: [[2, 67, 43]],
    Q: [[2, 33, 15], [2, 34, 16]],
    H: [[2, 33, 11], [2, 34, 12]],
  },
  6: { L: [[2, 86, 68]], M: [[4, 43, 27]], Q: [[4, 43, 19]], H: [[4, 43, 15]] },
  7: {
    L: [[2, 98, 78]],
    M: [[4, 49, 31]],
    Q: [[2, 32, 14], [4, 33, 15]],
    H: [[4, 39, 13], [1, 40, 14]],
  },
  8: {
    L: [[2, 121, 97]],
    M: [[2, 60, 38], [2, 61, 39]],
    Q: [[4, 40, 18], [2, 41, 19]],
    H: [[4, 40, 14], [2, 41, 15]],
  },
  9: {
    L: [[2, 146, 116]],
    M: [[3, 58, 36], [2, 59, 37]],
    Q: [[4, 36, 16], [4, 37, 17]],
    H: [[4, 36, 12], [4, 37, 13]],
  },
  10: {
    L: [[2, 86, 68], [2, 87, 69]],
    M: [[4, 69, 43], [1, 70, 44]],
    Q: [[6, 43, 19], [2, 44, 20]],
    H: [[6, 43, 15], [2, 44, 16]],
  },
}

const MODE_INDICATOR = 0x4
const PAD_CODEWORDS = [0xec, 0x11]
const encoder = new TextEncoder()

// --- Die exportierte Hauptklasse ---
export class QrCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('QR data must be a non-empty string.')
    }

    this.data = data
    this.options = {
      errorCorrectionLevel: 'Q',
      minVersion: 1,
      maxVersion: 10,
      mask: -1,
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

    const dataBytes = Array.from(encoder.encode(this.data))
    const version = this.#chooseVersion(dataBytes.length, errorCorrectionLevel, minVersion, maxVersion)
    const modules = this.#buildMatrix(dataBytes, version, errorCorrectionLevel, this.options.mask)

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
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 10) {
      throw new Error('This compact build currently supports QR versions 1 through 10.')
    }
    return numeric
  }

  #chooseVersion(byteLength, ecl, minVersion, maxVersion) {
    for (let version = minVersion; version <= maxVersion; version += 1) {
      const charCountBits = version < 10 ? 8 : 16
      const neededBits = 4 + charCountBits + byteLength * 8
      if (neededBits <= getDataCapacityBits(version, ecl)) {
        return version
      }
    }
    throw new Error('Input is too large for versions 1 through 10 in this build.')
  }

  #buildMatrix(dataBytes, version, ecl, maskPreference) {
    const size = version * 4 + 17
    const modules = createSquareArray(size, null)
    const isFunction = createSquareArray(size, false)

    drawFunctionPatterns(modules, isFunction, version)
    drawCodewords(modules, isFunction, createCodewords(dataBytes, version, ecl))

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

function createCodewords(dataBytes, version, ecl) {
  const blocks = getRsBlocks(version, ecl)
  const bitBuffer = []
  appendBits(bitBuffer, MODE_INDICATOR, 4)
  appendBits(bitBuffer, dataBytes.length, version < 10 ? 8 : 16)

  for (const value of dataBytes) {
    appendBits(bitBuffer, value, 8)
  }

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
  if (version === 1) {
    return []
  }

  const numAlign = Math.floor(version / 7) + 2
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2
  const positions = [6]
  for (let pos = version * 4 + 10; positions.length < numAlign; pos -= step) {
    positions.splice(1, 0, pos)
  }
  return positions
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
  result.shift()
  return result
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
