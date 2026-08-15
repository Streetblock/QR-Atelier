// GS1 Composite general-purpose field encodation (ISO/IEC 24723 method 0).

export const GS1_COMPOSITE_FNC1 = -1

const FILL_PATTERN = [0, 0, 1, 0, 0]

const BIT_CAPACITIES = Object.freeze({
  a: Object.freeze({
    2: Object.freeze([59, 78, 88, 108, 118, 138, 167]),
    3: Object.freeze([78, 98, 118, 138, 167]),
    4: Object.freeze([78, 108, 138, 167, 197]),
  }),
  b: Object.freeze({
    2: Object.freeze([56, 104, 160, 208, 256, 296, 336]),
    3: Object.freeze([32, 72, 112, 152, 208, 304, 416, 536, 648, 768]),
    4: Object.freeze([56, 96, 152, 208, 264, 352, 496, 672, 840, 1016, 1184]),
  }),
})

export function compactGs1Composite(data, options = {}) {
  const elements = parseGs1Elements(data)
  const field = buildGeneralPurposeField(elements)
  const requestedVersion = normalizeVersion(options.version ?? options.ccVersion ?? 'auto')
  const columns = normalizeColumns(options.columns ?? options.ccColumns ?? 2, requestedVersion)
  const versions = requestedVersion === 'auto' ? ['a', 'b', 'c'] : [requestedVersion]

  for (const version of versions) {
    if (version !== 'c') {
      const capacities = BIT_CAPACITIES[version][columns] ?? []
      for (const bitCapacity of capacities) {
        const encoded = encodeMethodZero(field, bitCapacity)
        if (encoded) return result(encoded, elements, field, version, columns, bitCapacity)
      }
      continue
    }

    const encoded = encodeForCcC(field, columns)
    if (encoded) return result(encoded.bits, elements, field, 'c', encoded.columns, encoded.bitCapacity, encoded)
  }

  throw new Error('GS1 data exceeds the requested Composite Component capacity.')
}

export function parseGs1Elements(data) {
  if (typeof data !== 'string' || data.length === 0) {
    throw new TypeError('GS1 Composite data must be a non-empty string.')
  }
  if (data.startsWith('(')) return parseBracketed(data, '(', ')')
  if (data.startsWith('[')) return parseBracketed(data, '[', ']')

  const parts = data.split('\x1d')
  if (parts.some((part) => part.length === 0)) {
    throw new Error('GS1 element strings must not contain empty fields.')
  }
  return Object.freeze(parts.map((value, index) => Object.freeze({
    ai: '',
    value,
    separator: index < parts.length - 1,
    raw: true,
  })))
}

export function getGs1CompositeBitCapacities(version, columns) {
  const normalized = normalizeVersion(version)
  if (normalized === 'auto' || normalized === 'c') return []
  return [...(BIT_CAPACITIES[normalized][Number(columns)] ?? [])]
}

function result(bits, elements, field, version, columns, bitCapacity, extra = {}) {
  return {
    bits: Object.freeze(bits),
    bitCapacity,
    version,
    columns,
    method: 0,
    elements,
    generalPurposeField: Object.freeze(field),
    ...extra,
  }
}

function parseBracketed(data, open, close) {
  const elements = []
  let position = 0
  while (position < data.length) {
    if (data[position] !== open) throw new Error(`Expected ${open} at position ${position}.`)
    const end = data.indexOf(close, position + 1)
    if (end < 0) throw new Error(`Missing ${close} for GS1 application identifier.`)
    const ai = data.slice(position + 1, end)
    if (!/^\d{2,4}$/.test(ai)) throw new Error(`Invalid GS1 application identifier: ${ai}`)
    const next = data.indexOf(open, end + 1)
    const value = data.slice(end + 1, next < 0 ? data.length : next)
    if (value.length === 0) throw new Error(`GS1 application identifier ${ai} has no value.`)
    elements.push({ ai, value, separator: false, raw: false })
    position = next < 0 ? data.length : next
  }
  for (let index = 0; index < elements.length - 1; index += 1) {
    elements[index].separator = !isFixedLengthAi(elements[index].ai)
  }
  return Object.freeze(elements.map((element) => Object.freeze(element)))
}

function buildGeneralPurposeField(elements) {
  const output = []
  for (const element of elements) {
    for (const char of `${element.ai}${element.value}`) output.push(char.charCodeAt(0))
    if (element.separator) output.push(GS1_COMPOSITE_FNC1)
  }
  return output
}

function encodeMethodZero(field, target) {
  const cdf = [0]
  const encoded = encodeGeneralPurposeField(field, target - cdf.length)
  if (!encoded) return null
  const bits = [...cdf, ...encoded.bits]
  const remaining = target - bits.length
  if (remaining < 0) return null

  let padding = repeatPattern(FILL_PATTERN, remaining)
  if (encoded.mode === 'numeric' && remaining > 0) {
    padding = [...[0, 0, 0, 0], ...padding].slice(0, remaining)
  }
  return [...bits, ...padding]
}

function encodeGeneralPurposeField(field, capacity) {
  const bits = []
  let mode = 'numeric'
  let position = 0

  while (position < field.length) {
    if (mode === 'numeric') {
      if (position + 1 < field.length && isNumericPair(field[position], field[position + 1])) {
        appendNumber(bits, numericPairValue(field[position], field[position + 1]), 7)
        position += 2
        continue
      }
      if (position === field.length - 1 && isDigit(field[position])) {
        const remaining = capacity - bits.length
        if (remaining >= 4 && remaining <= 6) {
          appendNumber(bits, field[position] - 47, 4)
          while (bits.length < capacity) bits.push(0)
          position += 1
          continue
        }
        if (remaining >= 7) {
          appendNumber(bits, numericPairValue(field[position], GS1_COMPOSITE_FNC1), 7)
          position += 1
          continue
        }
        return null
      }
      bits.push(0, 0, 0, 0)
      mode = 'alphanumeric'
      continue
    }

    if (mode === 'alphanumeric') {
      const value = field[position]
      if (value === GS1_COMPOSITE_FNC1) {
        bits.push(0, 1, 1, 1, 1)
        mode = 'numeric'
        position += 1
      } else if (isIsoOnly(value)) {
        bits.push(0, 0, 1, 0, 0)
        mode = 'iso646'
      } else if (numericRun(field, position) >= 6 || (
        numericRun(field, position) >= 4 && position + numericRun(field, position) === field.length
      )) {
        bits.push(0, 0, 0)
        mode = 'numeric'
      } else {
        const encoded = encodeAlphanumeric(value)
        if (!encoded) return null
        bits.push(...encoded)
        position += 1
      }
    } else {
      const value = field[position]
      if (value === GS1_COMPOSITE_FNC1) {
        bits.push(0, 1, 1, 1, 1)
        mode = 'numeric'
        position += 1
      } else if (numericRun(field, position) >= 4 && nextIsoOnly(field, position) >= 10) {
        bits.push(0, 0, 0)
        mode = 'numeric'
      } else if (alphanumericRun(field, position) >= 5 && nextIsoOnly(field, position) >= 10) {
        bits.push(0, 0, 1, 0, 0)
        mode = 'alphanumeric'
      } else {
        const encoded = encodeIso646(value)
        if (!encoded) return null
        bits.push(...encoded)
        position += 1
      }
    }

    if (bits.length > capacity) return null
  }

  return bits.length <= capacity ? { bits, mode } : null
}

function encodeForCcC(field, initialColumns) {
  let columns = initialColumns
  let target = 8304
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const provisional = encodeMethodZero(field, target)
    if (!provisional) return null
    const used = findUnpaddedLength(field, target)
    const bytes = Math.ceil(used / 8)
    const dataWords = Math.floor(bytes / 6) * 5 + (bytes % 6)
    const errorCodewords = selectCcCErrorCount(dataWords)
    const required = dataWords + errorCodewords + 3
    while (Math.ceil(required / columns) > 30 && columns < 30) columns += 1
    const rows = Math.max(3, Math.ceil(required / columns))
    const byteSlots = columns * rows - errorCodewords - 3
    target = (Math.floor(byteSlots / 5) * 6 + (byteSlots % 5)) * 8
    const bits = encodeMethodZero(field, target)
    if (bits) return { bits, bitCapacity: target, columns, rows, errorCodewords }
  }
  return null
}

function findUnpaddedLength(field, target) {
  const encoded = encodeGeneralPurposeField(field, target - 1)
  return encoded ? 1 + encoded.bits.length : target
}

function selectCcCErrorCount(dataWords) {
  if (dataWords <= 40) return 8
  if (dataWords <= 160) return 16
  if (dataWords <= 320) return 32
  if (dataWords <= 833) return 64
  return 32
}

function encodeAlphanumeric(value) {
  if (isDigit(value)) return numberBits(value - 43, 5)
  if (value >= 65 && value <= 90) return numberBits(value - 33, 6)
  if (value === 42) return numberBits(58, 6)
  if (value >= 44 && value <= 47) return numberBits(value + 15, 6)
  return null
}

function encodeIso646(value) {
  if (isDigit(value)) return numberBits(value - 43, 5)
  if (value >= 65 && value <= 90) return numberBits(value - 1, 7)
  if (value >= 97 && value <= 122) return numberBits(value - 7, 7)
  if (value === 33) return numberBits(232, 8)
  if (value === 34) return numberBits(233, 8)
  if (value >= 37 && value <= 47) return numberBits(value + 197, 8)
  if (value >= 58 && value <= 63) return numberBits(value + 187, 8)
  if (value === 95) return numberBits(251, 8)
  if (value === 32) return numberBits(252, 8)
  return null
}

function isNumericPair(first, second) {
  return (isDigit(first) || first === GS1_COMPOSITE_FNC1) &&
    (isDigit(second) || second === GS1_COMPOSITE_FNC1)
}

function numericPairValue(first, second) {
  const a = first === GS1_COMPOSITE_FNC1 ? 10 : first - 48
  const b = second === GS1_COMPOSITE_FNC1 ? 10 : second - 48
  return 11 * a + b + 8
}

function numericRun(field, position) {
  let length = 0
  while (position + length + 1 < field.length && isNumericPair(field[position + length], field[position + length + 1])) {
    length += 2
  }
  return length
}

function alphanumericRun(field, position) {
  let length = 0
  while (position + length < field.length && (
    field[position + length] === GS1_COMPOSITE_FNC1 || encodeAlphanumeric(field[position + length])
  )) length += 1
  return length
}

function nextIsoOnly(field, position) {
  let length = 0
  while (position + length < field.length && !isIsoOnly(field[position + length])) length += 1
  return length
}

function isIsoOnly(value) {
  return encodeIso646(value) !== null && encodeAlphanumeric(value) === null
}

function isDigit(value) {
  return value >= 48 && value <= 57
}

function appendNumber(bits, value, width) {
  bits.push(...numberBits(value, width))
}

function numberBits(value, width) {
  const output = []
  for (let bit = width - 1; bit >= 0; bit -= 1) output.push((value >>> bit) & 1)
  return output
}

function repeatPattern(pattern, length) {
  return Array.from({ length }, (_, index) => pattern[index % pattern.length])
}

function normalizeVersion(version) {
  const normalized = String(version).trim().toLowerCase().replace(/^cc-?/, '')
  if (!['auto', 'a', 'b', 'c'].includes(normalized)) {
    throw new Error('GS1 Composite version must be auto, A, B, or C.')
  }
  return normalized
}

function normalizeColumns(columns, version) {
  const numeric = Number(columns)
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 30) {
    throw new Error('GS1 Composite columns must be an integer from 1 to 30.')
  }
  if (version !== 'c' && version !== 'auto' && (numeric < 2 || numeric > 4)) {
    throw new Error('CC-A and CC-B require 2 to 4 columns.')
  }
  if (version === 'auto' && (numeric < 2 || numeric > 4)) {
    throw new Error('Automatic GS1 Composite selection starts with 2 to 4 columns.')
  }
  return numeric
}

function isFixedLengthAi(ai) {
  if (/^(00|01|02)$/.test(ai)) return true
  if (/^(11|12|13|15|16|17|20)$/.test(ai)) return true
  if (/^(3[1-6]\d\d|41[0-7])$/.test(ai)) return true
  return /^(422|424|425|426|7001|8001|8005|8006|8017|8018|8100|8101|8102|8111)$/.test(ai)
}
