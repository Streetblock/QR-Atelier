import {
  LEGACY_PLACEMENT_DATA_SIDES,
  placeLegacyBits as placeLegacyBitsWithGrid,
} from './DMlegacyPlacement.js'

export {
  getLegacyPlacement,
} from './DMlegacyPlacement.js'
export { LEGACY_PLACEMENT_DATA_SIDES }

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

const BASE_37_VALUES = new Map([
  [' ', 0],
  ...Array.from({ length: 26 }, (_, index) => [String.fromCharCode(65 + index), index + 1]),
  ...Array.from({ length: 10 }, (_, index) => [String(index), index + 27]),
])

const LEGACY_FORMATS = Object.freeze({
  1: Object.freeze({
    base: 11,
    groupSize: 6,
    widths: Object.freeze([0, 4, 7, 11, 14, 18, 21]),
    values: new Map([
      [' ', 0],
      ...Array.from({ length: 10 }, (_, index) => [String(index), index + 1]),
    ]),
  }),
  2: Object.freeze({
    base: 27,
    groupSize: 5,
    widths: Object.freeze([0, 5, 10, 15, 20, 24]),
    values: new Map([
      [' ', 0],
      ...Array.from({ length: 26 }, (_, index) => [String.fromCharCode(65 + index), index + 1]),
    ]),
  }),
  3: Object.freeze({ base: 41, groupSize: 4, widths: BASE_41_GROUP_WIDTHS, values: BASE_41_VALUES }),
  4: Object.freeze({
    base: 37, groupSize: 4, widths: Object.freeze([0, 6, 11, 16, 21]), values: BASE_37_VALUES,
  }),
})
const LEGACY_FORMAT_SELECTION_ORDER = Object.freeze([1, 2, 4, 3, 5, 6])

const ECC_050_HEADER = '0111000000000111000'
const LEGACY_ECC_HEADERS = Object.freeze({
  0: '0111111',
  50: ECC_050_HEADER,
  80: '0111000000111000111',
  100: '0111000000111111111',
  140: '0111000111000111111',
})
const LEGACY_ECC_MIN_DATA_SIDE = Object.freeze({ 0: 7, 50: 9, 80: 11, 100: 11, 140: 15 })

// Each output lists indexes in a flattened four-cycle window:
// [current input 1..3, previous cycle 1..3, ... previous cycle 3].
// The equations are verified against all 24 cycles of the ECC 050 reference.
const ECC_050_OUTPUT_TAPS = Object.freeze([
  Object.freeze([0, 5, 8, 10, 11]),
  Object.freeze([1, 4, 6, 9, 10]),
  Object.freeze([2, 3, 4, 5, 6, 9]),
  Object.freeze([0, 1, 2, 3, 4, 5, 7, 11]),
])

// Each output lists indexes in a flattened twelve-cycle window:
// [current input 1..2, previous cycle 1..2, ... previous cycle 11].
// The equations were transcribed from the 3-2-11 state-machine diagram. All
// 24 state positions were then solved at full rank from a Zebra 300 dpi
// hardware symbol produced by ^BXN,12,80,13,13,6^FDA^FS.
const ECC_080_OUTPUT_TAPS = Object.freeze([
  Object.freeze([0, 2, 6, 7, 10, 12, 14, 15, 17, 20, 23]),
  Object.freeze([1, 2, 7, 8, 10, 13, 16, 17, 18, 19, 20]),
  Object.freeze([0, 1, 3, 5, 9, 10, 12, 14, 15, 19, 23]),
])

// Indexes in [current input, previous input, ... input delayed 15 cycles].
// The equations were transcribed from the 2-1-15 state-machine diagram and
// independently cross-checked against four ECC 100 symbols.
const ECC_100_OUTPUT_TAPS = Object.freeze([
  Object.freeze([0, 2, 5, 6, 7, 8, 9, 10, 15]),
  Object.freeze([0, 1, 3, 4, 6, 11, 13, 14, 15]),
])

// Indexes in [current input, previous input, ... input delayed 13 cycles].
// The equations were transcribed from the 4-1-13 state-machine diagram and
// independently cross-checked against four ECC 140 symbols.
const ECC_140_OUTPUT_TAPS = Object.freeze([
  Object.freeze([0, 4, 7, 10, 12, 13]),
  Object.freeze([0, 3, 4, 7, 8, 9, 10, 11, 13]),
  Object.freeze([0, 1, 2, 4, 5, 7, 9, 11, 12, 13]),
  Object.freeze([0, 1, 2, 4, 5, 7, 9, 10, 11, 12, 13]),
])

// The 276 visually verified bytes are followed by the single least-significant
// zero bit shown in the source. Together they cover the largest 47x47 data area.
const LEGACY_MASTER_RANDOM_HEX = [
  '05 ff c7 31 88 a8 83 9c 64 87 9f 64 b3 e0 4d 9c 80 29 3a 90',
  'b3 8b 9e 90 45 bf f5 68 4b 08 cf 44 b8 d4 4c 5b a0 ab 72 52',
  '1c e4 d2 74 a4 da 8a 08 fa a7 c7 dd 00 30 a9 e6 64 ab d5 8b',
  'ed 9c 79 f8 08 d1 8b c6 22 64 0b 33 43 d0 80 d4 44 95 2e 6f',
  '5e 13 8d 47 62 06 eb 80 82 c9 41 d5 73 8a 30 23 24 e3 7f b2',
  'a8 0b ed 38 42 4c d7 b0 ce 98 bd e1 d5 e4 c3 1d 15 4a cf d1',
  '1f 39 26 18 93 fc 19 b2 2d ab f2 6e a1 9f af d0 8a 2b a0 56',
  'b0 41 6d 43 a4 63 f3 aa 7d af 35 57 c2 94 4a 65 0b 41 de b8',
  'e2 30 12 27 9b 66 2b 34 5b b8 99 e8 28 71 d0 95 6b 07 4d 3c',
  '7a b3 e5 29 b3 ba 8c cc 2d e0 c9 c0 22 ec 4c de f8 58 07 fc',
  '19 f2 64 e2 c3 e2 d8 b9 fd 67 a0 be f5 2e c9 49 75 62 82 27',
  '10 f4 19 6f 49 f7 b3 84 14 ea eb e1 2a 31 ab 47 7d 08 29 ac',
  'bb 72 fa fa 62 b8 c8 d3 86 89 95 fd df cc 9c ad f1 d4 6c 64',
  '23 24 2a 56 1f 36 eb b7 d6 ff da 57 f4 50 79 08',
].join(' ')

export const LEGACY_MASTER_RANDOM_BITS =
  LEGACY_MASTER_RANDOM_HEX.split(' ').map((hex) => bits(Number.parseInt(hex, 16), 8)).join('') + '0'

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

function encodeLegacyBase(data, formatId) {
  if (typeof data !== 'string') throw new TypeError('Legacy base input must be a string')
  const format = LEGACY_FORMATS[formatId]
  let encoded = ''
  for (let offset = 0; offset < data.length; offset += format.groupSize) {
    const group = data.slice(offset, offset + format.groupSize)
    let value = 0
    let weight = 1

    for (const character of group) {
      const digit = format.values.get(character)
      if (digit === undefined) {
        throw new RangeError(
          `Character ${JSON.stringify(character)} is not available in legacy base ${format.base}`,
        )
      }
      value += digit * weight
      weight *= format.base
    }

    const width = format.widths[group.length]
    encoded += bits(reverseBits(value, width), width)
  }
  return encoded
}

export function selectLegacyFormat(data) {
  if (data instanceof Uint8Array || Array.isArray(data)) {
    toBytes(data)
    return 6
  }
  if (typeof data !== 'string') {
    throw new TypeError('Legacy data must be a string, Uint8Array, or byte array')
  }

  const characters = Array.from(data)
  for (const formatId of LEGACY_FORMAT_SELECTION_ORDER) {
    if (formatId <= 4 && characters.every((character) => LEGACY_FORMATS[formatId].values.has(character))) {
      return formatId
    }
    if (formatId === 5 && characters.every((character) => character.codePointAt(0) <= 0x7f)) return formatId
    if (formatId === 6 && characters.every((character) => character.codePointAt(0) <= 0xff)) return formatId
  }
  throw new RangeError('Legacy data cannot represent characters above 8-bit values')
}

export function encodeLegacyData(data, { format = 'auto' } = {}) {
  const formatId = format === 'auto' ? selectLegacyFormat(data) : format
  if (!Number.isInteger(formatId) || formatId < 1 || formatId > 6) {
    throw new RangeError('Legacy format must be auto or an integer from 1 through 6')
  }
  if (formatId <= 4) return { formatId, encodedBits: encodeLegacyBase(data, formatId) }

  if (formatId === 5 && typeof data !== 'string') {
    throw new TypeError('Legacy ASCII input must be a string')
  }
  const values = formatId === 5
    ? Array.from(data, (character) => character.codePointAt(0))
    : toBytes(data)
  const maximum = formatId === 5 ? 0x7f : 0xff
  if (values.some((value) => value > maximum)) {
    throw new RangeError(`Legacy format ${formatId} input exceeds its ${maximum + 1}-value repertoire`)
  }
  const width = formatId === 5 ? 7 : 8
  return {
    formatId,
    encodedBits: values.map((value) => bits(reverseBits(value, width), width)).join(''),
  }
}

export function encodeLegacyBase41(data) {
  return encodeLegacyBase(data, 3)
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

export function buildLegacyUnprotectedBits(data, { format = 'auto', formatId } = {}) {
  const selectedFormat = formatId ?? format
  const encoded = encodeLegacyData(data, { format: selectedFormat })
  const dataLength = typeof data === 'string' ? Array.from(data).length : toBytes(data).length
  if (dataLength > 0x1ff) throw new RangeError('Legacy record length exceeds the 9-bit field')

  const formatField = bits(encoded.formatId - 1, 5)
  const crcField = calculateLegacyCrcField(encoded.formatId, data)
  const lengthField = bits(reverseBits(dataLength, 9), 9)
  return formatField + crcField + lengthField + encoded.encodedBits
}

function encodeLegacyConvolution(
  unprotectedBits,
  { label, inputWidth, flushCycles, outputTaps },
) {
  requireBitString(unprotectedBits, `${label} input`)

  const paddedInput = unprotectedBits.padEnd(
    Math.ceil(unprotectedBits.length / inputWidth) * inputWidth,
    '0',
  )
  const groups = paddedInput.match(new RegExp(`.{${inputWidth}}`, 'gu')) ?? []
  groups.push(...Array(flushCycles).fill('0'.repeat(inputWidth)))

  const history = Array.from(
    { length: flushCycles },
    () => Array(inputWidth).fill(0),
  )
  let protectedBits = ''

  for (const group of groups) {
    const current = Array.from(group, Number)
    const window = [...current, ...history.flat()]
    for (const taps of outputTaps) {
      protectedBits += String(taps.reduce((parity, index) => parity ^ window[index], 0))
    }
    history.pop()
    history.unshift(current)
  }

  return protectedBits
}

export function encodeLegacyEcc050(unprotectedBits) {
  return encodeLegacyConvolution(unprotectedBits, {
    label: 'ECC 050', inputWidth: 3, flushCycles: 3, outputTaps: ECC_050_OUTPUT_TAPS,
  })
}

export function encodeLegacyEcc000(unprotectedBits) {
  requireBitString(unprotectedBits, 'ECC 000 input')
  return unprotectedBits
}

export function encodeLegacyEcc080(unprotectedBits) {
  return encodeLegacyConvolution(unprotectedBits, {
    label: 'ECC 080', inputWidth: 2, flushCycles: 11, outputTaps: ECC_080_OUTPUT_TAPS,
  })
}

export function encodeLegacyEcc100(unprotectedBits) {
  return encodeLegacyConvolution(unprotectedBits, {
    label: 'ECC 100', inputWidth: 1, flushCycles: 15, outputTaps: ECC_100_OUTPUT_TAPS,
  })
}

export function encodeLegacyEcc140(unprotectedBits) {
  return encodeLegacyConvolution(unprotectedBits, {
    label: 'ECC 140', inputWidth: 1, flushCycles: 13, outputTaps: ECC_140_OUTPUT_TAPS,
  })
}

function protectLegacyBits(unprotectedBits, ecc) {
  if (ecc === 0) return encodeLegacyEcc000(unprotectedBits)
  if (ecc === 50) return encodeLegacyEcc050(unprotectedBits)
  if (ecc === 80) return encodeLegacyEcc080(unprotectedBits)
  if (ecc === 100) return encodeLegacyEcc100(unprotectedBits)
  if (ecc === 140) return encodeLegacyEcc140(unprotectedBits)
  throw new RangeError('Legacy ECC mode must be 0, 50, 80, 100, or 140')
}

export function selectLegacyDataSide(usedBits, { ecc = 0, symbolSize = null } = {}) {
  if (!Number.isInteger(usedBits) || usedBits < 0) {
    throw new RangeError('Used legacy module count must be a non-negative integer')
  }
  const minimumDataSide = LEGACY_ECC_MIN_DATA_SIDE[ecc]
  if (minimumDataSide === undefined) {
    throw new RangeError('Legacy ECC mode must be 0, 50, 80, 100, or 140')
  }

  const supportedDataSides = LEGACY_PLACEMENT_DATA_SIDES.filter(
    (dataSide) => dataSide >= minimumDataSide,
  )

  if (symbolSize !== null) {
    if (!Number.isInteger(symbolSize) || symbolSize < 9 || symbolSize > 49 || symbolSize % 2 === 0) {
      throw new RangeError('Legacy symbol size must be an odd integer from 9 through 49')
    }

    const dataSide = symbolSize - 2
    if (!supportedDataSides.includes(dataSide)) {
      throw new RangeError(`ECC ${String(ecc).padStart(3, '0')} does not support ${symbolSize}x${symbolSize}`)
    }
    if (usedBits > dataSide * dataSide) {
      throw new RangeError(
        `Legacy data requires ${usedBits} modules but ${symbolSize}x${symbolSize} provides ${dataSide * dataSide}`,
      )
    }
    return dataSide
  }

  const dataSide = supportedDataSides.find((side) => usedBits <= side * side)
  if (dataSide === undefined) {
    throw new RangeError(
      `Legacy data requires ${usedBits} modules and exceeds the maximum 2209-module placement`,
    )
  }
  return dataSide
}

export function buildLegacyUnrandomizedBits(
  unprotectedBits,
  { ecc = 0, symbolSize = null } = {},
) {
  requireBitString(unprotectedBits, 'Legacy unprotected input')
  const protectedBits = protectLegacyBits(unprotectedBits, ecc)
  const header = LEGACY_ECC_HEADERS[ecc]
  const usedBits = header.length + protectedBits.length
  const dataSide = selectLegacyDataSide(usedBits, { ecc, symbolSize })
  const unrandomizedBits = header + protectedBits + '0'.repeat(dataSide * dataSide - usedBits)
  return { dataSide, protectedBits, unrandomizedBits }
}


export function buildLegacyEcc050UnrandomizedBits(unprotectedBits, { dataSide = 11 } = {}) {
  return buildLegacyUnrandomizedBits(
    unprotectedBits,
    { ecc: 50, symbolSize: dataSide + 2 },
  ).unrandomizedBits
}

export function randomizeLegacyBits(unrandomizedBits) {
  requireBitString(unrandomizedBits, 'Legacy randomization input')
  if (unrandomizedBits.length > LEGACY_MASTER_RANDOM_BITS.length) {
    throw new RangeError('Legacy randomization supports at most 2209 bits')
  }
  return Array.from(
    unrandomizedBits,
    (bit, index) => String(Number(bit) ^ Number(LEGACY_MASTER_RANDOM_BITS[index])),
  ).join('')
}

export function placeLegacyBits(randomizedBits, dataSide) {
  return placeLegacyBitsWithGrid(randomizedBits, dataSide)
}

export function placeLegacy11x11(randomizedBits) {
  return placeLegacyBitsWithGrid(randomizedBits, 11)
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

export function generateLegacyDataMatrix(
  data,
  { ecc = 0, format = 'auto', symbolSize = null } = {},
) {
  const formatId = format === 'auto' ? selectLegacyFormat(data) : format
  const unprotectedBits = buildLegacyUnprotectedBits(data, { format: formatId })
  const stage = buildLegacyUnrandomizedBits(unprotectedBits, { ecc, symbolSize })
  const randomizedBits = randomizeLegacyBits(stage.unrandomizedBits)
  const dataModules = placeLegacyBitsWithGrid(randomizedBits, stage.dataSide)
  const modules = addLegacyFinderPattern(dataModules)
  const side = stage.dataSide + 2

  return {
    rows: side,
    cols: side,
    modules,
    ecc,
    formatId,
    dataSide: stage.dataSide,
    unprotectedBits,
    protectedBits: stage.protectedBits,
    unrandomizedBits: stage.unrandomizedBits,
    randomizedBits,
  }
}

export function generateLegacyEcc050Reference(data) {
  return generateLegacyDataMatrix(data, { ecc: 50, format: 3, symbolSize: 13 })
}
