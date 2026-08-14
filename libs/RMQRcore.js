// ISO/IEC 23941 rMQR matrix generator (Numeric, Alphanumeric and UTF-8 Byte modes).

const HEIGHTS = [7,7,7,7,7,9,9,9,9,9,11,11,11,11,11,11,13,13,13,13,13,13,15,15,15,15,15,17,17,17,17,17]
const WIDTHS = [43,59,77,99,139,43,59,77,99,139,27,43,59,77,99,139,27,43,59,77,99,139,43,59,77,99,139,43,59,77,99,139]
const TOTAL_CODEWORDS = [13,21,32,44,68,21,33,49,66,99,15,31,47,67,89,132,21,41,60,85,113,166,51,74,103,136,199,61,88,122,160,232]
const REMAINDER_BITS = [0,3,5,6,1,2,3,1,4,5,2,1,0,2,7,6,4,1,6,4,3,0,1,4,6,7,2,1,2,0,3,4]
const DATA_CODEWORDS = {
  M: [6,12,20,28,44,12,21,31,42,63,7,19,31,43,57,84,12,27,38,53,73,106,33,48,67,88,127,39,56,78,100,152],
  H: [3,7,10,14,24,7,11,17,22,33,5,11,15,23,29,42,7,13,20,29,35,54,15,26,31,48,69,21,28,38,56,76],
}
const BLOCK_COUNTS = {
  M: [1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,2,1,1,1,2,2,3,1,1,2,2,3,1,2,2,3,4],
  H: [1,1,1,1,2,1,1,2,2,3,1,1,2,2,2,3,1,1,2,2,3,4,2,2,3,4,5,2,2,3,4,6],
}
const CCI = {
  numeric: [4,5,6,7,7,5,6,7,7,8,4,6,7,7,8,8,5,6,7,7,8,8,7,7,8,8,9,7,8,8,8,9],
  alphanumeric: [3,5,5,6,6,5,5,6,6,7,4,5,6,6,7,7,5,6,6,7,7,8,6,7,7,7,8,6,7,7,8,8],
  byte: [3,4,5,5,6,4,5,5,6,6,3,5,5,6,6,7,4,5,6,6,7,7,6,6,7,7,7,6,6,7,7,8],
}
const ALIGNMENT_CENTERS = { 27: [], 43: [21], 59: [19,39], 77: [25,51], 99: [23,49,75], 139: [27,55,83,111] }
const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
const MODE_BITS = { numeric: 0b001, alphanumeric: 0b010, byte: 0b011 }
const encoder = new TextEncoder()

export const RMQR_VERSIONS = Object.freeze(HEIGHTS.map((height, index) => Object.freeze({
  name: `R${height}x${WIDTHS[index]}`,
  index,
  height,
  width: WIDTHS[index],
})))

export class RMqrCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string' || data.length === 0) throw new Error('rMQR data must be a non-empty string.')
    this.data = data
    this.options = { errorCorrectionLevel: 'M', version: 'auto', mode: 'auto', fitStrategy: 'balanced', ...options }
  }

  generate() {
    const ecl = String(this.options.errorCorrectionLevel).toUpperCase()
    if (!DATA_CODEWORDS[ecl]) throw new Error('rMQR supports only error correction levels M and H.')
    const mode = String(this.options.mode).toLowerCase()
    if (!['auto', 'numeric', 'alphanumeric', 'byte'].includes(mode)) throw new Error(`Unsupported rMQR mode: ${this.options.mode}`)

    const candidates = this.options.version === 'auto'
      ? RMQR_VERSIONS
      : RMQR_VERSIONS.filter((item) => item.name.toUpperCase() === String(this.options.version).toUpperCase())
    if (!candidates.length) throw new Error(`Unsupported rMQR version: ${this.options.version}`)

    const fitting = []
    for (const version of candidates) {
      const segments = optimizeSegments(this.data, version.index, mode)
      const neededBits = segments.reduce((sum, segment) => sum + segmentBitLength(segment, version.index), 0)
      if (neededBits <= DATA_CODEWORDS[ecl][version.index] * 8) fitting.push({ version, segments, neededBits })
    }
    if (!fitting.length) throw new Error('The data is too long for the selected rMQR settings.')
    fitting.sort((a, b) => fitScore(a.version, this.options.fitStrategy) - fitScore(b.version, this.options.fitStrategy) || a.version.index - b.version.index)

    const { version, segments } = fitting[0]
    const dataCodewords = makeDataCodewords(segments, version.index, DATA_CODEWORDS[ecl][version.index])
    const finalCodewords = addErrorCorrection(dataCodewords, version.index, ecl)
    const modules = buildMatrix(version, ecl, finalCodewords)
    return {
      data: this.data,
      format: 'rmqr',
      symbology: 'rMQR',
      version: version.name,
      versionIndex: version.index,
      width: version.width,
      height: version.height,
      size: Math.max(version.width, version.height),
      errorCorrectionLevel: ecl,
      segments: segments.map(({ mode: segmentMode, data }) => ({ mode: segmentMode, data })),
      modules,
    }
  }
}

function fitScore(version, strategy) {
  const normalized = String(strategy).toLowerCase()
  if (normalized === 'width' || normalized === 'minimize-width') return version.width * 1000 + version.height
  if (normalized === 'height' || normalized === 'minimize-height') return version.height * 1000 + version.width
  return version.height * 9 + version.width
}

function optimizeSegments(data, versionIndex, forcedMode) {
  if (forcedMode !== 'auto') {
    if (!isValidForMode(data, forcedMode)) throw new Error(`Data cannot be encoded in rMQR ${forcedMode} mode.`)
    return [{ mode: forcedMode, data }]
  }
  const chars = Array.from(data)
  const best = new Array(chars.length + 1).fill(null)
  best[0] = { cost: 0, segments: [] }
  for (let start = 0; start < chars.length; start += 1) {
    if (!best[start]) continue
    for (const mode of ['numeric', 'alphanumeric', 'byte']) {
      for (let end = start + 1; end <= chars.length; end += 1) {
        const part = chars.slice(start, end).join('')
        if (!isValidForMode(part, mode)) break
        if (best[start].segments.at(-1)?.mode === mode) continue
        const segment = { mode, data: part }
        const cost = best[start].cost + segmentBitLength(segment, versionIndex)
        if (!best[end] || cost < best[end].cost) best[end] = { cost, segments: [...best[start].segments, segment] }
      }
    }
  }
  return best[chars.length].segments
}

function isValidForMode(data, mode) {
  if (mode === 'numeric') return /^[0-9]+$/.test(data)
  if (mode === 'alphanumeric') return Array.from(data).every((char) => ALPHANUMERIC.includes(char))
  return mode === 'byte'
}

function segmentBitLength(segment, versionIndex) {
  const count = segment.mode === 'byte' ? encoder.encode(segment.data).length : Array.from(segment.data).length
  let payloadBits
  if (segment.mode === 'numeric') payloadBits = Math.floor(count / 3) * 10 + [0,4,7][count % 3]
  else if (segment.mode === 'alphanumeric') payloadBits = Math.floor(count / 2) * 11 + (count % 2) * 6
  else payloadBits = count * 8
  return 3 + CCI[segment.mode][versionIndex] + payloadBits
}

function makeDataCodewords(segments, versionIndex, capacity) {
  const bits = []
  for (const segment of segments) {
    appendBits(bits, MODE_BITS[segment.mode], 3)
    const values = Array.from(segment.data)
    const count = segment.mode === 'byte' ? encoder.encode(segment.data).length : values.length
    appendBits(bits, count, CCI[segment.mode][versionIndex])
    if (segment.mode === 'numeric') {
      for (let i = 0; i < values.length; i += 3) {
        const group = values.slice(i, i + 3).join('')
        appendBits(bits, Number(group), [0,4,7,10][group.length])
      }
    } else if (segment.mode === 'alphanumeric') {
      for (let i = 0; i < values.length; i += 2) {
        if (i + 1 < values.length) appendBits(bits, ALPHANUMERIC.indexOf(values[i]) * 45 + ALPHANUMERIC.indexOf(values[i + 1]), 11)
        else appendBits(bits, ALPHANUMERIC.indexOf(values[i]), 6)
      }
    } else {
      for (const value of encoder.encode(segment.data)) appendBits(bits, value, 8)
    }
  }
  const capacityBits = capacity * 8
  for (let i = 0; i < Math.min(3, capacityBits - bits.length); i += 1) bits.push(0)
  while (bits.length % 8) bits.push(0)
  const result = []
  for (let i = 0; i < bits.length; i += 8) result.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0))
  for (let pad = 0; result.length < capacity; pad += 1) result.push(pad % 2 === 0 ? 0xec : 0x11)
  return result
}

function addErrorCorrection(data, versionIndex, ecl) {
  const blockCount = BLOCK_COUNTS[ecl][versionIndex]
  const total = TOTAL_CODEWORDS[versionIndex]
  const shortTotal = Math.floor(total / blockCount)
  const longCount = total % blockCount
  const shortCount = blockCount - longCount
  const shortData = Math.floor(data.length / blockCount)
  const longDataCount = data.length % blockCount
  if (longDataCount !== longCount) throw new Error('Invalid internal rMQR block definition.')
  const eccLength = shortTotal - shortData
  const blocks = []
  let offset = 0
  for (let i = 0; i < blockCount; i += 1) {
    const length = shortData + (i >= shortCount ? 1 : 0)
    const blockData = data.slice(offset, offset + length)
    blocks.push({ data: blockData, ecc: reedSolomonRemainder(blockData, eccLength) })
    offset += length
  }
  const result = []
  for (let i = 0; i < shortData + 1; i += 1) for (const block of blocks) if (i < block.data.length) result.push(block.data[i])
  for (let i = 0; i < eccLength; i += 1) for (const block of blocks) result.push(block.ecc[i])
  return result
}

function buildMatrix(version, ecl, codewords) {
  const modules = Array.from({ length: version.height }, () => Array(version.width).fill(null))
  drawFinderPatterns(modules)
  drawCornerPatterns(modules)
  drawAlignmentPatterns(modules)
  drawTimingPatterns(modules)
  drawFormatInformation(modules, version.index, ecl)
  drawData(modules, codewords, REMAINDER_BITS[version.index])
  return modules
}

function drawFinderPatterns(modules) {
  const height = modules.length, width = modules[0].length
  for (let y = 0; y < 7; y += 1) for (let x = 0; x < 7; x += 1) modules[y][x] = y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4)
  for (let n = 0; n < 8; n += 1) { if (n < height) modules[n][7] = false; if (height >= 9) modules[7][n] = false }
  for (let dy = 0; dy < 5; dy += 1) for (let dx = 0; dx < 5; dx += 1) modules[height - 1 - dy][width - 1 - dx] = dy === 0 || dy === 4 || dx === 0 || dx === 4 || (dy === 2 && dx === 2)
}

function drawCornerPatterns(modules) {
  const h = modules.length, w = modules[0].length
  modules[h - 1][0] = modules[h - 1][1] = modules[h - 1][2] = true
  if (h >= 11) { modules[h - 2][0] = true; modules[h - 2][1] = false }
  modules[0][w - 1] = modules[0][w - 2] = modules[1][w - 1] = true
  modules[1][w - 2] = false
}

function drawAlignmentPatterns(modules) {
  const h = modules.length, w = modules[0].length
  for (const center of ALIGNMENT_CENTERS[w]) {
    for (let dy = 0; dy < 3; dy += 1) for (let dx = 0; dx < 3; dx += 1) {
      const value = dy === 0 || dy === 2 || dx === 0 || dx === 2
      modules[dy][center + dx - 1] = value
      modules[h - 1 - dy][center + dx - 1] = value
    }
  }
}

function drawTimingPatterns(modules) {
  const h = modules.length, w = modules[0].length
  for (let x = 0; x < w; x += 1) for (const y of [0, h - 1]) if (modules[y][x] === null) modules[y][x] = x % 2 === 0
  for (const x of [0, w - 1, ...ALIGNMENT_CENTERS[w]]) for (let y = 0; y < h; y += 1) if (modules[y][x] === null) modules[y][x] = y % 2 === 0
}

function drawFormatInformation(modules, versionIndex, ecl) {
  let data = versionIndex | (ecl === 'H' ? 1 << 5 : 0)
  let remainder = data << 12
  const generator = 0b1111100100101
  while (bitLength(remainder) >= 13) remainder ^= generator << (bitLength(remainder) - 13)
  const format = (data << 12) | remainder
  const left = format ^ 0b011111101010110010
  for (let n = 0; n < 18; n += 1) modules[1 + (n % 5)][8 + Math.floor(n / 5)] = ((left >>> n) & 1) !== 0
  const h = modules.length, w = modules[0].length
  const right = format ^ 0b100000101001111011
  for (let n = 0; n < 15; n += 1) modules[h - 6 + (n % 5)][w - 8 + Math.floor(n / 5)] = ((right >>> n) & 1) !== 0
  modules[h - 6][w - 5] = ((right >>> 15) & 1) !== 0
  modules[h - 6][w - 4] = ((right >>> 16) & 1) !== 0
  modules[h - 6][w - 3] = ((right >>> 17) & 1) !== 0
}

function drawData(modules, codewords, remainderBits) {
  const bits = []
  for (const codeword of codewords) appendBits(bits, codeword, 8)
  for (let i = 0; i < remainderBits; i += 1) bits.push(0)
  const h = modules.length, w = modules[0].length
  let direction = -1, x = w - 2, y = h - 6, index = 0
  while (index < bits.length) {
    for (const column of [x, x - 1]) if (modules[y][column] === null && index < bits.length) {
      const mask = (Math.floor(y / 2) + Math.floor(column / 3)) % 2 === 0
      modules[y][column] = (bits[index] === 1) !== mask
      index += 1
    }
    if (direction < 0 && y === 1) { x -= 2; direction = 1 }
    else if (direction > 0 && y === h - 2) { x -= 2; direction = -1 }
    else y += direction
  }
  if (index !== bits.length) throw new Error('Failed to place all rMQR data bits.')
}

function appendBits(target, value, length) {
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** length) throw new Error('Value does not fit in the requested bit length.')
  for (let i = length - 1; i >= 0; i -= 1) target.push((value >>> i) & 1)
}

function bitLength(value) { return value === 0 ? 0 : 32 - Math.clz32(value) }

function reedSolomonRemainder(data, degree) {
  const divisor = reedSolomonGenerator(degree)
  const result = new Array(degree).fill(0)
  for (const value of data) {
    const factor = value ^ result.shift()
    result.push(0)
    divisor.forEach((coefficient, index) => { result[index] ^= multiplyFiniteField(coefficient, factor) })
  }
  return result
}

function reedSolomonGenerator(degree) {
  let result = [1], root = 1
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(result.length + 1).fill(0)
    for (let j = 0; j < result.length; j += 1) { next[j] ^= multiplyFiniteField(result[j], root); next[j + 1] ^= result[j] }
    result = next
    root = multiplyFiniteField(root, 2)
  }
  result.pop()
  return result.reverse()
}

function multiplyFiniteField(x, y) {
  let result = 0
  for (let i = 7; i >= 0; i -= 1) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d)
    result ^= ((y >>> i) & 1) * x
  }
  return result
}
