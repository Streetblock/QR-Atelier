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
