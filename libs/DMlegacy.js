// Data Matrix ECC 000-140 primitives.
//
// The legacy family is intentionally kept separate from DMcore.js (ECC 200).
// This first slice covers the base-41 high-level encoder and record prefix used
// by the complete ECC 050 reference vector. Error correction, randomization,
// and module placement are added as separately testable stages.

const BASE_41_VALUES = new Map([
  [' ', 0],
  ...Array.from({ length: 26 }, (_, index) => [String.fromCharCode(65 + index), index + 1]),
  ...Array.from({ length: 10 }, (_, index) => [String(index), index + 27]),
  ['.', 37],
  [',', 38],
  ['-', 39],
  ['/', 40],
])

const BASE_41_GROUP_WIDTHS = Object.freeze([0, 6, 11, 17, 22])

const ECC_050_HEADER = '0111000000000111000'

// Each output lists indexes in a flattened four-cycle window:
// [current input 1..3, previous cycle 1..3, ... previous cycle 3].
// The equations are verified against all 24 cycles of the ECC 050 reference.
const ECC_050_OUTPUT_TAPS = Object.freeze([
  Object.freeze([0, 5, 8, 10, 11]),
  Object.freeze([1, 4, 6, 9, 10]),
  Object.freeze([2, 3, 4, 5, 6, 9]),
  Object.freeze([0, 1, 2, 3, 4, 5, 7, 11]),
])

// Visually transcribed from the 11x11 placement grid. Positions are zero-based
// indexes into the randomized bit stream and form a permutation of 0..120.
const LEGACY_PLACEMENT_11 = Object.freeze([
  Object.freeze([2, 26, 114, 70, 15, 103, 59, 37, 81, 4, 1]),
  Object.freeze([117, 73, 18, 106, 62, 40, 84, 7, 95, 51, 29]),
  Object.freeze([12, 100, 56, 34, 78, 92, 89, 45, 23, 111, 67]),
  Object.freeze([65, 43, 87, 10, 98, 54, 32, 120, 76, 21, 109]),
  Object.freeze([82, 5, 93, 49, 27, 115, 71, 16, 104, 60, 38]),
  Object.freeze([96, 52, 30, 118, 74, 19, 107, 63, 41, 85, 8]),
  Object.freeze([24, 112, 68, 13, 101, 57, 35, 79, 48, 90, 46]),
  Object.freeze([75, 20, 108, 64, 42, 86, 9, 97, 53, 31, 119]),
  Object.freeze([102, 58, 36, 80, 77, 91, 47, 25, 113, 69, 14]),
  Object.freeze([39, 83, 6, 94, 50, 28, 116, 72, 17, 105, 61]),
  Object.freeze([0, 88, 44, 22, 110, 66, 11, 99, 55, 33, 3]),
])

// Only the visually verified prefix needed by the 11x11 reference is exposed
// in this slice. The complete stream is added before supporting larger sizes.
const LEGACY_RANDOM_PREFIX = Object.freeze([
  0x05, 0xff, 0xc7, 0x31, 0x88, 0xa8, 0x83, 0x9c,
  0x64, 0x87, 0x9f, 0x64, 0xb3, 0xe0, 0x4d, 0x9c,
])

function reverseBits(value, width) {
  let reversed = 0
  for (let bit = 0; bit < width; bit += 1) {
    reversed = (reversed << 1) | ((value >>> bit) & 1)
  }
  return reversed
}

function bits(value, width) {
  return value.toString(2).padStart(width, '0')
}

function requireBitString(value, name) {
  if (typeof value !== 'string' || /[^01]/u.test(value)) {
    throw new TypeError(`${name} must be a binary string`)
  }
}

function toBytes(data) {
  if (typeof data === 'string') {
    const bytes = Array.from(data, (character) => character.codePointAt(0))
    if (bytes.some((value) => value > 0xff)) {
      throw new RangeError('Legacy CRC input must contain 8-bit values')
    }
    return bytes
  }

  if (data instanceof Uint8Array || Array.isArray(data)) {
    const bytes = Array.from(data)
    if (bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 0xff)) {
      throw new RangeError('Legacy CRC input must contain 8-bit values')
    }
    return bytes
  }

  throw new TypeError('Legacy CRC input must be a string, Uint8Array, or byte array')
}

export function encodeLegacyBase41(data) {
  if (typeof data !== 'string') throw new TypeError('Base-41 input must be a string')

  let encoded = ''
  for (let offset = 0; offset < data.length; offset += 4) {
    const group = data.slice(offset, offset + 4)
    let value = 0
    let weight = 1

    for (const character of group) {
      const digit = BASE_41_VALUES.get(character)
      if (digit === undefined) {
        throw new RangeError(`Character ${JSON.stringify(character)} is not available in legacy base 41`)
      }
      value += digit * weight
      weight *= 41
    }

    const width = BASE_41_GROUP_WIDTHS[group.length]
    encoded += bits(reverseBits(value, width), width)
  }

  return encoded
}

export function calculateLegacyCrcRegister(formatId, data) {
  if (!Number.isInteger(formatId) || formatId < 1 || formatId > 6) {
    throw new RangeError('Legacy format ID must be between 1 and 6')
  }

  // Reflected CRC-CCITT (x^16 + x^12 + x^5 + 1), initialized to zero.
  // The two-byte format header precedes the original, uncompressed bytes.
  let crc = 0
  for (const byte of [formatId, 0, ...toBytes(data)]) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0x8408 : crc >>> 1
    }
  }
  return crc
}

export function calculateLegacyCrcField(formatId, data) {
  return bits(reverseBits(calculateLegacyCrcRegister(formatId, data), 16), 16)
}

export function buildLegacyUnprotectedBits(data, { formatId = 3 } = {}) {
  if (formatId !== 3) {
    throw new RangeError('Only legacy base-41 format ID 3 is implemented so far')
  }
  if (data.length > 0x1ff) throw new RangeError('Legacy record length exceeds the 9-bit field')

  const formatField = bits(formatId - 1, 5)
  const crcField = calculateLegacyCrcField(formatId, data)
  const lengthField = bits(reverseBits(data.length, 9), 9)
  return formatField + crcField + lengthField + encodeLegacyBase41(data)
}

export function encodeLegacyEcc050(unprotectedBits) {
  requireBitString(unprotectedBits, 'ECC 050 input')

  const paddedInput = unprotectedBits.padEnd(Math.ceil(unprotectedBits.length / 3) * 3, '0')
  const groups = paddedInput.match(/.{3}/gu) ?? []
  groups.push('000', '000', '000')

  const history = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  let protectedBits = ''

  for (const group of groups) {
    const current = Array.from(group, Number)
    const window = [...current, ...history[0], ...history[1], ...history[2]]
    for (const taps of ECC_050_OUTPUT_TAPS) {
      protectedBits += String(taps.reduce((parity, index) => parity ^ window[index], 0))
    }
    history.pop()
    history.unshift(current)
  }

  return protectedBits
}

export function buildLegacyEcc050UnrandomizedBits(unprotectedBits, { dataSide = 11 } = {}) {
  requireBitString(unprotectedBits, 'ECC 050 input')
  if (!Number.isInteger(dataSide) || dataSide < 9 || dataSide > 47 || dataSide % 2 === 0) {
    throw new RangeError('Legacy data side must be an odd integer from 9 through 47 for ECC 050')
  }

  const protectedBits = encodeLegacyEcc050(unprotectedBits)
  const capacity = dataSide * dataSide
  const used = ECC_050_HEADER.length + protectedBits.length
  if (used > capacity) throw new RangeError(`ECC 050 data requires ${used} modules but only ${capacity} are available`)
  return ECC_050_HEADER + protectedBits + '0'.repeat(capacity - used)
}

export function randomizeLegacyBits(unrandomizedBits) {
  requireBitString(unrandomizedBits, 'Legacy randomization input')
  const randomBits = LEGACY_RANDOM_PREFIX.map((byte) => bits(byte, 8)).join('')
  if (unrandomizedBits.length > randomBits.length) {
    throw new RangeError('The verified random prefix currently supports at most 128 bits')
  }
  return Array.from(unrandomizedBits, (bit, index) => String(Number(bit) ^ Number(randomBits[index]))).join('')
}

export function placeLegacy11x11(randomizedBits) {
  requireBitString(randomizedBits, 'Legacy placement input')
  if (randomizedBits.length !== 121) throw new RangeError('The 11x11 placement grid requires exactly 121 bits')
  return LEGACY_PLACEMENT_11.map((row) => row.map((index) => randomizedBits[index] === '1'))
}

export function addLegacyFinderPattern(dataModules) {
  const dataSide = dataModules.length
  if (dataSide === 0 || dataModules.some((row) => !Array.isArray(row) || row.length !== dataSide)) {
    throw new RangeError('Legacy data modules must be a non-empty square matrix')
  }

  const symbolSide = dataSide + 2
  const modules = Array.from({ length: symbolSide }, () => Array(symbolSide).fill(false))
  for (let column = 0; column < symbolSide; column += 1) modules[0][column] = column % 2 === 0
  for (let row = 0; row < symbolSide; row += 1) {
    modules[row][0] = true
    modules[row][symbolSide - 1] = row % 2 === 0
  }
  modules[symbolSide - 1].fill(true)
  for (let row = 0; row < dataSide; row += 1) {
    for (let column = 0; column < dataSide; column += 1) {
      modules[row + 1][column + 1] = Boolean(dataModules[row][column])
    }
  }
  return modules
}

export function generateLegacyEcc050Reference(data) {
  const unprotectedBits = buildLegacyUnprotectedBits(data, { formatId: 3 })
  const protectedBits = encodeLegacyEcc050(unprotectedBits)
  const unrandomizedBits = buildLegacyEcc050UnrandomizedBits(unprotectedBits, { dataSide: 11 })
  const randomizedBits = randomizeLegacyBits(unrandomizedBits)
  const dataModules = placeLegacy11x11(randomizedBits)
  const modules = addLegacyFinderPattern(dataModules)
  return {
    rows: 13,
    cols: 13,
    modules,
    unprotectedBits,
    protectedBits,
    unrandomizedBits,
    randomizedBits,
  }
}
