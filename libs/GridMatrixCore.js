// Grid Matrix encoder (AIMD014 / GB/T 27766-2011).
// Algorithm and conformance tables adapted from libzint backend/gridmtx.c.
// Copyright (C) 2009-2026 Robin Stuart <rstuart114@gmail.com>
// SPDX-License-Identifier: BSD-3-Clause

const RECOMMENDED_CODEWORDS = [9, 30, 59, 114, 170, 237, 315, 405, 506, 618, 741, 875, 1021]
const MAX_CODEWORDS = [11, 40, 89, 146, 218, 305, 405, 521, 650, 794, 953, 1125, 1313]

const DATA_CODEWORDS = [
  [0, 15, 13, 11, 9],
  [45, 40, 35, 30, 25],
  [89, 79, 69, 59, 49],
  [146, 130, 114, 98, 81],
  [218, 194, 170, 146, 121],
  [305, 271, 237, 203, 169],
  [405, 360, 315, 270, 225],
  [521, 463, 405, 347, 289],
  [650, 578, 506, 434, 361],
  [794, 706, 618, 530, 441],
  [953, 847, 741, 635, 529],
  [1125, 1000, 875, 750, 625],
  [1313, 1167, 1021, 875, 729],
]

const N1 = [18, 50, 98, 81, 121, 113, 113, 116, 121, 126, 118, 125, 122]
const B1 = [1, 1, 1, 2, 2, 2, 2, 3, 2, 7, 5, 10, 6]
const B2 = [0, 0, 0, 0, 0, 1, 2, 2, 4, 0, 4, 0, 6]
const ECC_BLOCKS = [
  [[0, 0, 0], [3, 1, 0], [5, 1, 0], [7, 1, 0], [9, 1, 0]],
  [[5, 1, 0], [10, 1, 0], [15, 1, 0], [20, 1, 0], [25, 1, 0]],
  [[9, 1, 0], [19, 1, 0], [29, 1, 0], [39, 1, 0], [49, 1, 0]],
  [[8, 2, 0], [16, 2, 0], [24, 2, 0], [32, 2, 0], [41, 1, 40]],
  [[12, 2, 0], [24, 2, 0], [36, 2, 0], [48, 2, 0], [61, 1, 60]],
  [[11, 3, 0], [23, 1, 22], [34, 2, 33], [45, 3, 0], [57, 1, 56]],
  [[12, 1, 11], [23, 2, 22], [34, 3, 33], [45, 4, 0], [57, 1, 56]],
  [[12, 2, 11], [23, 5, 0], [35, 3, 34], [47, 1, 46], [58, 4, 57]],
  [[12, 6, 0], [24, 6, 0], [36, 6, 0], [48, 6, 0], [61, 1, 60]],
  [[13, 4, 12], [26, 1, 25], [38, 5, 37], [51, 2, 50], [63, 7, 0]],
  [[12, 6, 11], [24, 4, 23], [36, 2, 35], [47, 9, 0], [59, 7, 58]],
  [[13, 5, 12], [25, 10, 0], [38, 5, 37], [50, 10, 0], [63, 5, 62]],
  [[13, 1, 12], [25, 3, 24], [37, 5, 36], [49, 7, 48], [61, 9, 60]],
]

const CHINESE = 1, NUMERAL = 2, LOWER = 3, UPPER = 4, MIXED = 5, BYTE = 6, EOD = 7
const MODE_TYPES = [CHINESE, NUMERAL, LOWER, UPPER, MIXED, BYTE]
const MODE_NAMES = ['chinese', 'numeral', 'lower', 'upper', 'mixed', 'byte']
const MODE_SWITCH = [
  [1, 2, 3, 4, 5, 7],
  [0, 8161, 8162, 8163, 8164, 8165],
  [1019, 0, 1020, 1021, 1022, 1023],
  [28, 29, 0, 30, 124, 126],
  [28, 29, 30, 0, 124, 126],
  [1009, 1010, 1011, 1012, 0, 1015],
  [1, 2, 3, 4, 5, 0],
  [8160, 1018, 27, 27, 1008, 0],
]
const MODE_LENGTH = [
  [4, 4, 4, 4, 4, 4],
  [0, 13, 13, 13, 13, 13],
  [10, 0, 10, 10, 10, 10],
  [5, 5, 0, 5, 7, 7],
  [5, 5, 5, 0, 7, 7],
  [10, 10, 10, 10, 0, 10],
  [4, 4, 4, 4, 4, 0],
  [13, 10, 5, 5, 10, 4],
]
const NUMERAL_NON_DIGITS = ' +-.,'

export class GridMatrixCore {
  constructor(data, options = {}) {
    this.data = data
    this.options = { ...options }
  }

  static fromSegments(segments, options = {}) {
    return new GridMatrixCore({ segments }, options)
  }

  generate() {
    const payload = normalizePayload(this.data, this.options.eci)
    const controls = normalizeControls(this.options)
    const requestedMode = this.options.mode == null ? 'auto' : String(this.options.mode).toLowerCase()
    if (!['auto', 'byte'].includes(requestedMode)) {
      throw new RangeError("Grid Matrix mode must be 'auto' or 'byte'.")
    }
    let bits = controls.prefix, modes = []
    for (const segment of payload.segments) {
      if (requestedMode === 'byte') {
        bits = encodeByteSegments(segment.bytes, segment.eci, bits, false)
        modes.push(...Array(segment.bytes.length).fill(BYTE))
      } else {
        const encoded = encodeOptimized(segment.bytes, segment.eci, bits, false)
        bits = encoded.bits
        modes.push(...encoded.modes)
      }
    }
    padHighLevelBits(bits)
    const dataCodewords = bitsToCodewords(bits)
    const layers = chooseLayers(dataCodewords.length, this.options.layers)
    const eccLevel = chooseEccLevel(dataCodewords.length, layers, this.options.eccLevel)
    const codewords = addErrorCorrection(dataCodewords, layers, eccLevel)
    const modules = placeSymbol(codewords, layers, eccLevel)

    return {
      format: 'GridMatrix',
      version: layers,
      layers,
      eccLevel,
      eci: payload.segmented ? null : payload.segments[0].eci,
      segments: payload.segmented ? payload.segments.map(segment => ({ eci: segment.eci, length: segment.bytes.length })) : null,
      readerInitialization: controls.readerInitialization,
      structuredAppend: controls.structuredAppend,
      encoding: requestedMode,
      modes: modes.map(mode => MODE_NAMES[mode - 1]),
      width: modules.length,
      height: modules.length,
      modules,
      dataCodewords,
      codewords,
      readyForScan: true,
    }
  }
}

function normalizePayload(value, requestedEci) {
  const wrappedSegments = value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.segments)
    ? value.segments : null
  const directSegments = Array.isArray(value) && value.length > 0
    && value.every(segment => segment && typeof segment === 'object' && !Array.isArray(segment) && 'data' in segment)
    ? value : null
  const segments = wrappedSegments || directSegments
  if (!segments) return { segments: [normalizeInput(value, requestedEci)], segmented: false }
  if (requestedEci != null) throw new RangeError('Use an ECI on each Grid Matrix segment instead of the global eci option.')
  if (segments.length === 0) throw new RangeError('Grid Matrix segments must not be empty.')
  return {
    segments: segments.map((segment, index) => {
      if (!('data' in segment)) throw new TypeError(`Grid Matrix segment ${index + 1} requires data.`)
      return normalizeInput(segment.data, segment.eci)
    }),
    segmented: true,
  }
}

function normalizeControls(options) {
  const requestedReaderInitialization = options.readerInitialization === true
  if (options.readerInitialization != null && typeof options.readerInitialization !== 'boolean') {
    throw new TypeError('Grid Matrix readerInitialization must be boolean.')
  }

  let structuredAppend = null
  if (options.structuredAppend != null) {
    const value = options.structuredAppend
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Grid Matrix structuredAppend must be an object.')
    }
    const count = Number(value.count), index = Number(value.index)
    const id = value.id == null ? 0 : Number(value.id)
    if (!Number.isInteger(count) || count < 2 || count > 16) {
      throw new RangeError('Grid Matrix structuredAppend count must be an integer from 2 to 16.')
    }
    if (!Number.isInteger(index) || index < 1 || index > count) {
      throw new RangeError('Grid Matrix structuredAppend index must be an integer from 1 to count.')
    }
    if (!Number.isInteger(id) || id < 0 || id > 255) {
      throw new RangeError('Grid Matrix structuredAppend id must be an integer from 0 to 255.')
    }
    structuredAppend = { index, count, id }
  }

  const readerInitialization = requestedReaderInitialization && (!structuredAppend || structuredAppend.index === 1)
  const prefix = []
  if (readerInitialization) appendBits(prefix, 10, 4)
  if (structuredAppend) {
    appendBits(prefix, 9, 4)
    appendBits(prefix, structuredAppend.id, 8)
    appendBits(prefix, structuredAppend.count - 1, 4)
    appendBits(prefix, structuredAppend.index - 1, 4)
  }
  return { prefix, readerInitialization, structuredAppend }
}

function normalizeInput(value, requestedEci) {
  let bytes, automaticEci = 0
  if (typeof value === 'string') {
    const requested = requestedEci == null ? null : Number(requestedEci)
    if (requested != null && ![0, 26, 29].includes(requested)) {
      throw new RangeError('String input currently supports automatic ECI, UTF-8 ECI 26, or GB2312 ECI 29.')
    }
    if (requested === 26) {
      bytes = new TextEncoder().encode(value)
      automaticEci = 26
    } else {
      const gb2312 = encodeGb2312(value)
      if (gb2312) {
        bytes = gb2312
        automaticEci = requested === 29 ? 29 : 0
      } else if (requested === 0 || requested === 29) {
        throw new RangeError('Grid Matrix input contains characters that are not representable in GB2312.')
      } else {
        bytes = new TextEncoder().encode(value)
        automaticEci = 26
      }
    }
  } else if (value instanceof Uint8Array) {
    bytes = new Uint8Array(value)
  } else if (Array.isArray(value) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
    bytes = Uint8Array.from(value)
  } else {
    throw new TypeError('Grid Matrix data must be a string, Uint8Array, or array of bytes.')
  }
  if (bytes.length === 0) throw new RangeError('Grid Matrix data must not be empty.')

  const eci = requestedEci == null ? automaticEci : Number(requestedEci)
  if (!Number.isInteger(eci) || eci < 0 || eci > 811799) {
    throw new RangeError('Grid Matrix ECI must be an integer from 0 to 811799.')
  }
  return { bytes, eci }
}

let gb2312EncodeMap
function encodeGb2312(value) {
  if (!gb2312EncodeMap) gb2312EncodeMap = buildGb2312EncodeMap()
  const result = []
  for (const character of value) {
    const code = character.codePointAt(0)
    if (code <= 0x7F) result.push(code)
    else {
      const encoded = gb2312EncodeMap.get(character)
      if (encoded == null) return null
      result.push(encoded)
    }
  }
  return result
}

function buildGb2312EncodeMap() {
  let decoder
  try { decoder = new TextDecoder('gb18030', { fatal: true }) }
  catch { throw new Error('This platform does not provide the GB18030 decoder required for Grid Matrix Chinese mode.') }
  const map = new Map()
  for (const [firstStart, firstEnd] of [[0xA1, 0xA9], [0xB0, 0xF7]]) {
    for (let first = firstStart; first <= firstEnd; first++) {
      for (let second = 0xA1; second <= 0xFE; second++) {
        try {
          const character = decoder.decode(Uint8Array.of(first, second))
          if (character.length && character !== '\uFFFD' && !map.has(character)) map.set(character, first << 8 | second)
        } catch { /* Unassigned GB2312 position. */ }
      }
    }
  }
  return map
}

function encodeByteSegments(bytes, eci, prefix = [], pad = true) {
  const bits = [...prefix]
  appendEci(bits, eci)
  const flatBytes = Array.from(bytes).flatMap(value => value > 0xFF ? [value >> 8, value & 0xFF] : [value])
  for (let offset = 0; offset < flatBytes.length; offset += 512) {
    const block = flatBytes.slice(offset, Math.min(offset + 512, flatBytes.length))
    appendBits(bits, 7, 4)
    appendBits(bits, block.length - 1, 9)
    for (const byte of block) appendBits(bits, byte, 8)
  }
  appendBits(bits, 0, 4) // End of data from byte mode.
  if (pad) padHighLevelBits(bits)
  if (bits.length > 9191) throw new RangeError('Grid Matrix input exceeds the 1313 data-codeword limit.')
  return bits
}

function encodeOptimized(data, eci, prefix = [], pad = true) {
  const bits = [...prefix]
  appendEci(bits, eci)
  const modes = defineModes(data)
  let position = 0, currentMode = 0, lastMode = 0
  let numeralCount = 0, numeralPadPosition = 0
  let byteCount = 0, byteCountPosition = 0

  while (position < data.length) {
    const nextMode = modes[position]
    if (nextMode !== currentMode) {
      if (currentMode === BYTE) {
        writeBitsAt(bits, byteCountPosition, byteCount - 1, 9)
        byteCount = 0
      } else if (currentMode === NUMERAL && numeralCount) {
        writeBitsAt(bits, numeralPadPosition, 3 - numeralCount, 2)
      }
      appendBits(bits, MODE_SWITCH[currentMode][nextMode - 1], MODE_LENGTH[currentMode][nextMode - 1])
    }
    lastMode = currentMode
    currentMode = nextMode

    if (currentMode === CHINESE) {
      let glyph
      if (data[position] > 0xFF) {
        const first = data[position] >> 8, second = data[position] & 0xFF
        glyph = first <= 0xA9 ? 0x60 * (first - 0xA1) + second - 0xA0
          : 0x60 * (first - 0xB0 + 9) + second - 0xA0
        position++
      } else if (position + 1 < data.length && data[position] === 13 && data[position + 1] === 10) {
        glyph = 7776; position += 2
      } else if (position + 1 < data.length && isDigit(data[position]) && isDigit(data[position + 1])) {
        glyph = 8033 + 10 * (data[position] - 48) + data[position + 1] - 48; position += 2
      } else {
        glyph = 7777 + data[position++]
      }
      appendBits(bits, glyph, 13)
    } else if (currentMode === NUMERAL) {
      if (lastMode !== currentMode) {
        numeralPadPosition = bits.length
        appendBits(bits, 0, 2)
      }
      numeralCount = 0
      let punctuation = 0, nonDigitPosition = -1
      const digits = [48, 48, 48]
      while (numeralCount < 3 && position < data.length && modes[position] === NUMERAL) {
        const value = data[position]
        if (isDigit(value)) digits[numeralCount++] = value
        else if (NUMERAL_NON_DIGITS.includes(String.fromCharCode(value))) {
          if (nonDigitPosition !== -1) break
          punctuation = value; nonDigitPosition = numeralCount
        } else if (position + 1 < data.length && value === 13 && data[position + 1] === 10) {
          if (nonDigitPosition !== -1) break
          punctuation = value; nonDigitPosition = numeralCount; position++
        } else break
        position++
      }
      if (nonDigitPosition !== -1) {
        let glyph = punctuation === 13 ? 15 : NUMERAL_NON_DIGITS.indexOf(String.fromCharCode(punctuation)) * 3
        appendBits(bits, 1000 + glyph + nonDigitPosition, 10)
      }
      appendBits(bits, 100 * (digits[0] - 48) + 10 * (digits[1] - 48) + digits[2] - 48, 10)
    } else if (currentMode === BYTE) {
      if (lastMode !== currentMode) {
        byteCountPosition = bits.length
        appendBits(bits, 0, 9)
      }
      let value = data[position++]
      if (byteCount === 512 || (value > 0xFF && byteCount === 511)) {
        if (value > 0xFF && byteCount === 511) {
          appendBits(bits, value >> 8, 8)
          value &= 0xFF
          byteCount++
        }
        writeBitsAt(bits, byteCountPosition, byteCount - 1, 9)
        appendBits(bits, 7, 4)
        byteCountPosition = bits.length
        appendBits(bits, 0, 9)
        byteCount = 0
      }
      appendBits(bits, value, value > 0xFF ? 16 : 8)
      byteCount++
      if (value > 0xFF) byteCount++
    } else if (currentMode === MIXED) {
      const value = data[position++]
      if (value === 32 || isDigit(value) || isAlpha(value)) {
        const glyph = value === 32 ? 62 : value - (isDigit(value) ? 48 : isUpper(value) ? 55 : 61)
        appendBits(bits, glyph, 6)
      } else {
        appendBits(bits, 1014, 10)
        appendShift(bits, value)
      }
    } else {
      const value = data[position++]
      const directlyEncodable = value === 32 || (currentMode === UPPER ? isUpper(value) : isLower(value))
      if (directlyEncodable) appendBits(bits, value === 32 ? 26 : value - (currentMode === UPPER ? 65 : 97), 5)
      else { appendBits(bits, 125, 7); appendShift(bits, value) }
    }
    if (bits.length > 9191) throw new RangeError('Grid Matrix input exceeds the 1313 data-codeword limit.')
  }

  if (currentMode === BYTE) writeBitsAt(bits, byteCountPosition, byteCount - 1, 9)
  else if (currentMode === NUMERAL && numeralCount) writeBitsAt(bits, numeralPadPosition, 3 - numeralCount, 2)
  appendBits(bits, MODE_SWITCH[EOD][currentMode - 1], MODE_LENGTH[EOD][currentMode - 1])
  if (pad) padHighLevelBits(bits)
  if (bits.length > 9191) throw new RangeError('Grid Matrix input exceeds the 1313 data-codeword limit.')
  return { bits, modes }
}

function padHighLevelBits(bits) {
  while (bits.length % 7) bits.push(0)
}

function appendEci(bits, eci) {
  if (!eci) return
  appendBits(bits, 12, 4)
  if (eci <= 1023) appendBits(bits, eci, 11)
  else if (eci <= 32767) { appendBits(bits, 2, 2); appendBits(bits, eci, 15) }
  else { appendBits(bits, 3, 2); appendBits(bits, eci, 20) }
}

function appendShift(bits, value) {
  const glyph = value < 32 ? value : value < 48 ? value - 1 : value < 65 ? value - 11 : value < 97 ? value - 46 : value - 63
  appendBits(bits, glyph, 6)
}

function writeBitsAt(target, position, value, length) {
  for (let bit = length - 1; bit >= 0; bit--) target[position++] = (value >>> bit) & 1
}

function defineModes(data) {
  const multiplier = 6
  const headCosts = [24, 36, 24, 24, 24, 78]
  const switchCosts = [
    [0, 90, 78, 78, 78, 132],
    [60, 0, 60, 60, 60, 114],
    [30, 42, 0, 30, 42, 96],
    [30, 42, 30, 0, 42, 96],
    [60, 72, 60, 60, 0, 114],
    [24, 36, 24, 24, 24, 0],
  ]
  const eodCosts = [78, 60, 30, 30, 60, 24]
  const history = Array.from({ length: data.length }, () => Array(6).fill(0))
  let previous = [...headCosts]
  let numeralEnd = 0, numeralCost = 0, byteCount = 0

  for (let position = 0; position < data.length; position++) {
    const current = Array(6).fill(0)
    const value = data[position], doubleByte = value > 0xFF
    const space = !doubleByte && value === 32, digit = !doubleByte && isDigit(value)
    const lower = !doubleByte && isLower(value), upper = !doubleByte && isUpper(value)
    const control = !space && !digit && !lower && !upper && value < 127
    const doubleDigit = digit && position + 1 < data.length && isDigit(data[position + 1])
    const eol = value === 13 && position + 1 < data.length && data[position + 1] === 10

    current[0] = previous[0] + (doubleDigit || eol ? 39 : 78); history[position][0] = CHINESE
    let byteDouble = doubleByte
    if (byteCount === 512 || (byteDouble && byteCount === 511)) {
      current[5] = headCosts[5]
      if (byteDouble && byteCount === 511) { current[5] += 48; byteDouble = false }
      byteCount = 0
    }
    current[5] += previous[5] + (byteDouble ? 96 : 48); history[position][5] = BYTE
    byteCount += byteDouble ? 2 : 1

    const numeral = numeralAt(data, position, numeralEnd)
    if (numeral.valid) {
      if (numeral.cost != null) { numeralEnd = numeral.end; numeralCost = numeral.cost }
      current[1] = previous[1] + numeralCost; history[position][1] = NUMERAL
    } else if (position >= numeralEnd) numeralEnd = 0

    if (control) {
      current[2] = previous[2] + 78; history[position][2] = LOWER
      current[3] = previous[3] + 78; history[position][3] = UPPER
      current[4] = previous[4] + 96; history[position][4] = MIXED
    } else {
      if (lower || space) { current[2] = previous[2] + 30; history[position][2] = LOWER }
      if (upper || space) { current[3] = previous[3] + 30; history[position][3] = UPPER }
      if (digit || lower || upper || space) { current[4] = previous[4] + 36; history[position][4] = MIXED }
    }
    if (position + 1 === data.length) for (let mode = 0; mode < 6; mode++) if (history[position][mode]) current[mode] += eodCosts[mode]
    for (let to = 0; to < 6; to++) {
      for (let from = 0; from < 6; from++) {
        if (to === from || !history[position][from]) continue
        const cost = current[from] + switchCosts[from][to]
        if (!history[position][to] || cost < current[to]) { current[to] = cost; history[position][to] = MODE_TYPES[from] }
      }
    }
    previous = current
  }

  let modeIndex = 0
  for (let i = 1; i < 6; i++) if (previous[i] < previous[modeIndex]) modeIndex = i
  const modes = Array(data.length)
  let mode = MODE_TYPES[modeIndex]
  for (let position = data.length - 1; position >= 0; position--) {
    modeIndex = MODE_TYPES.indexOf(mode)
    mode = history[position][modeIndex]
    modes[position] = mode
  }
  return modes
}

function numeralAt(data, position, previousEnd) {
  if (position < previousEnd) return { valid: true, end: previousEnd, cost: null }
  let digitCount = 0, nonDigit = 0, nonDigitPosition = 0, i = position
  for (; i < data.length && i < position + 4 && digitCount < 3; i++) {
    if (isDigit(data[i])) digitCount++
    else if (NUMERAL_NON_DIGITS.includes(String.fromCharCode(data[i]))) {
      if (nonDigit) return { valid: false }
      nonDigit = 1; nonDigitPosition = i
    } else if (i + 1 < data.length && data[i] === 13 && data[i + 1] === 10) {
      if (nonDigit) return { valid: false }
      i++; nonDigit = 2; nonDigitPosition = i
    } else break
  }
  if (!digitCount) return { valid: false }
  if (nonDigit && nonDigitPosition === i - 1) nonDigit = 0
  const end = position + digitCount + nonDigit
  let cost
  if (digitCount === 3) cost = nonDigit === 2 ? 24 : nonDigit === 1 ? 30 : 20
  else if (digitCount === 2) cost = nonDigit === 2 ? 30 : nonDigit === 1 ? 40 : 30
  else cost = nonDigit === 2 ? 40 : 60
  return { valid: true, end, cost }
}

function isDigit(value) { return value >= 48 && value <= 57 }
function isLower(value) { return value >= 97 && value <= 122 }
function isUpper(value) { return value >= 65 && value <= 90 }
function isAlpha(value) { return isLower(value) || isUpper(value) }

function appendBits(target, value, length) {
  for (let bit = length - 1; bit >= 0; bit--) target.push((value >>> bit) & 1)
}

function bitsToCodewords(bits) {
  const result = []
  for (let i = 0; i < bits.length; i += 7) {
    let value = 0
    for (let j = 0; j < 7; j++) value = (value << 1) | bits[i + j]
    result.push(value)
  }
  return result
}

function chooseLayers(count, requested) {
  let recommended = RECOMMENDED_CODEWORDS.findIndex(capacity => count <= capacity) + 1
  if (!recommended) throw new RangeError('Grid Matrix input exceeds the largest symbol capacity.')
  const minimum = MAX_CODEWORDS.findIndex(capacity => count <= capacity) + 1
  if (requested == null) return recommended
  const layers = Number(requested)
  if (!Number.isInteger(layers) || layers < 1 || layers > 13) {
    throw new RangeError('Grid Matrix layers must be an integer from 1 to 13.')
  }
  if (layers < minimum) throw new RangeError(`Grid Matrix version ${layers} cannot hold ${count} data codewords.`)
  return layers
}

function chooseEccLevel(count, layers, requested) {
  const minimumRecommended = layers === 1 ? 4 : layers === 2 ? 2 : 1
  let level = layers === 1 ? 5 : layers <= 3 ? 4 : 3
  if (requested != null) {
    const value = Number(requested)
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new RangeError('Grid Matrix ECC level must be an integer from 1 to 5.')
    }
    level = Math.max(value, minimumRecommended)
  }
  const lowest = layers === 1 ? 2 : 1
  while (level > lowest && count > DATA_CODEWORDS[layers - 1][level - 1]) level--
  if (count > DATA_CODEWORDS[layers - 1][level - 1]) {
    throw new RangeError(`Grid Matrix version ${layers} cannot hold ${count} codewords at an available ECC level.`)
  }
  return level
}

function addErrorCorrection(input, layers, eccLevel) {
  const dataCapacity = DATA_CODEWORDS[layers - 1][eccLevel - 1]
  const data = Array(dataCapacity).fill(0)
  data.splice(0, input.length, ...input)
  for (let i = input.length + 1; i < dataCapacity; i++) {
    if (i & 1) data[i] = 0x7E
  }

  const n1 = N1[layers - 1]
  const b1 = B1[layers - 1]
  const b2 = B2[layers - 1]
  const [e1, b3, e2] = ECC_BLOCKS[layers - 1][eccLevel - 1]
  const blockCount = b1 + b2
  const output = []
  let position = 0
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
    const blockSize = blockIndex < b1 ? n1 : n1 - 1
    const eccSize = blockIndex < b3 ? e1 : e2
    const dataSize = blockSize - eccSize
    const blockData = data.slice(position, position + dataSize)
    position += dataSize
    const block = [...blockData, ...reedSolomon(blockData, eccSize)]
    for (let i = 0; i < block.length; i++) output[blockCount * i + blockIndex] = block[i]
  }
  return output
}

function reedSolomon(data, degree) {
  const gf = createGaloisField(0x89, 128)
  const generator = Array(degree + 1).fill(0)
  generator[0] = 1
  for (let i = 1, root = 1; i <= degree; i++, root++) {
    generator[i] = 1
    for (let k = i - 1; k > 0; k--) {
      if (generator[k]) generator[k] = gf.exp[(gf.log[generator[k]] + root) % 127]
      generator[k] ^= generator[k - 1]
    }
    generator[0] = gf.exp[(gf.log[generator[0]] + root) % 127]
  }

  const result = Array(degree).fill(0)
  for (const value of data) {
    const feedback = result[degree - 1] ^ value
    if (feedback) {
      const log = gf.log[feedback]
      for (let k = degree - 1; k > 0; k--) {
        result[k] = result[k - 1] ^ (generator[k] ? gf.exp[(log + gf.log[generator[k]]) % 127] : 0)
      }
      result[0] = gf.exp[(log + gf.log[generator[0]]) % 127]
    } else {
      for (let k = degree - 1; k > 0; k--) result[k] = result[k - 1]
      result[0] = 0
    }
  }
  return result.reverse()
}

function createGaloisField(primitive, size) {
  const exp = Array(size), log = Array(size)
  let value = 1
  for (let i = 0; i < size; i++) {
    exp[i] = value
    value <<= 1
    if (value >= size) value = (value ^ primitive) & (size - 1)
  }
  for (let i = 0; i < size - 1; i++) log[exp[i]] = i
  return { exp, log }
}

function placeSymbol(codewords, layers, eccLevel) {
  const size = 6 + layers * 12
  const count = 1 + layers * 2
  const modules = Array.from({ length: size }, () => Array(size).fill(false))
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      const index = macromoduleIndex(count, x, y)
      placeMacromodule(modules, x, y, codewords[index] | (codewords[index + 1] << 7))
    }
  }
  placeLayerIds(modules, layers, eccLevel)
  placeFrames(modules, count)
  return modules
}

function macromoduleIndex(count, x, y) {
  const ring = Math.min(x, y, count - y - 1, count - x - 1)
  const ringSize = ((count - 1) >> 1) * 2 - ring * 2 + 1
  const highest = ringSize * ringSize - 1
  let index
  if (x === ring) index = highest - y + ring
  else if (y === ring) index = highest - (ringSize - 1) * 4 + x - ring
  else if (x === count - ring - 1) index = highest - (ringSize - 1) * 3 + y - ring
  else index = highest - (ringSize - 1) - (x - ring)
  return index * 2
}

function placeMacromodule(modules, macroX, macroY, value) {
  const x = macroX * 6 + 1
  const y = macroY * 6 + 1
  if (value & 0x2000) modules[y][x + 2] = true
  if (value & 0x1000) modules[y][x + 3] = true
  for (let row = 1; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      if ((value >> (15 - row * 4 - column)) & 1) modules[y + row][x + column] = true
    }
  }
}

function placeLayerIds(modules, layers, eccLevel) {
  const count = 1 + layers * 2
  const ids = Array.from({ length: count }, () => Array(count).fill(0))
  let start = count >> 1, stop = count >> 1
  for (let layer = 0; layer <= layers; layer++, start--, stop++) {
    const id = eccLevel === 1 ? 3 - (layer & 3) : (layer + 5 - eccLevel) & 3
    for (let i = start; i <= stop; i++) {
      ids[start][i] = id; ids[i][start] = id
      ids[count - start - 1][i] = id; ids[i][count - start - 1] = id
    }
  }
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (ids[y][x] & 2) modules[y * 6 + 1][x * 6 + 1] = true
      if (ids[y][x] & 1) modules[y * 6 + 1][x * 6 + 2] = true
    }
  }
}

function placeFrames(modules, count) {
  for (let x = 0; x < count; x++) {
    let dark = !(x & 1)
    for (let y = 0; y < count; y++, dark = !dark) {
      if (!dark) continue
      const left = x * 6, top = y * 6
      for (let i = 0; i < 5; i++) {
        modules[top][left + i] = true
        modules[top + 5][left + i] = true
        modules[top + i][left] = true
        modules[top + i][left + 5] = true
      }
      modules[top + 5][left + 5] = true
    }
  }
}
