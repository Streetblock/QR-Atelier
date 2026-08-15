// Shared ISO/IEC 15438 high-level compaction for PDF417 and MicroPDF417.

const TEXT = 0
const BYTE = 1
const NUMERIC = 2

const ALPHA = 0
const LOWER = 1
const MIXED = 2
const PUNCT = 3

const TEXT_LATCH = 900
const BYTE_LATCH = 901
const NUMERIC_LATCH = 902
const BYTE_SHIFT = 913
const BYTE_LATCH_SIX = 924

const encoder = new TextEncoder()

const TEXT_TABLES = [
  createCharacterMap('ABCDEFGHIJKLMNOPQRSTUVWXYZ '),
  createCharacterMap('abcdefghijklmnopqrstuvwxyz '),
  createCharacterMap('0123456789&\r\t,:#-.$/+%*=^', 0, [[' ', 26]]),
  createCharacterMap(';<>@[\\]_`~!\r\t,:\n-.$/"|*()?{}\''),
]

const LATCH_SEQUENCES = [
  [[], [27], [28], [28, 25]],
  [[28, 28], [], [28], [28, 25]],
  [[28], [27], [], [25]],
  [[29], [29, 27], [29, 28], []],
]

export const Pdf417CompactionMode = Object.freeze({
  AUTO: 'auto',
  TEXT: 'text',
  BYTE: 'byte',
  NUMERIC: 'numeric',
})

/**
 * Compacts a string or byte array into PDF417 data codewords.
 * `initialMode` is `text` for PDF417 and `byte` for MicroPDF417.
 */
export function compactPdf417(data, options = {}) {
  const bytes = normalizeBytes(data)
  if (bytes.length === 0) throw new Error('PDF417 data must not be empty.')

  const mode = normalizeMode(options.mode)
  const initialMode = normalizeInitialMode(options.initialMode)

  if (mode === 'text') {
    assertTextBytes(bytes)
    return [
      ...(initialMode === TEXT ? [] : [TEXT_LATCH]),
      ...encodeText(bytes),
    ]
  }
  if (mode === 'numeric') {
    assertNumericBytes(bytes)
    return [NUMERIC_LATCH, ...encodeNumeric(bytes)]
  }
  if (mode === 'byte') return encodeBytesWithLatch(bytes)

  return compactAutomatically(bytes, initialMode)
}

export function normalizePdf417Bytes(data) {
  return normalizeBytes(data)
}

export function encodePdf417Text(data) {
  const bytes = normalizeBytes(data)
  assertTextBytes(bytes)
  return encodeText(bytes)
}

export function encodePdf417Bytes(data) {
  return encodeBytesWithLatch(normalizeBytes(data))
}

export function encodePdf417Numeric(data) {
  const bytes = normalizeBytes(data)
  assertNumericBytes(bytes)
  return [NUMERIC_LATCH, ...encodeNumeric(bytes)]
}

function compactAutomatically(bytes, initialMode) {
  const output = []
  let position = 0
  let currentMode = initialMode

  while (position < bytes.length) {
    const digitCount = countDigits(bytes, position)
    if (digitCount >= 13) {
      if (currentMode !== NUMERIC) output.push(NUMERIC_LATCH)
      output.push(...encodeNumeric(bytes.subarray(position, position + digitCount)))
      position += digitCount
      currentMode = NUMERIC
      continue
    }

    const textCount = countText(bytes, position)
    if (textCount >= 5 || textCount === bytes.length - position) {
      if (currentMode !== TEXT) output.push(TEXT_LATCH)
      output.push(...encodeText(bytes.subarray(position, position + textCount)))
      position += textCount
      currentMode = TEXT
      continue
    }

    const byteCount = countBinary(bytes, position)
    const chunk = bytes.subarray(position, position + byteCount)
    if (byteCount === 1 && currentMode === TEXT) {
      output.push(BYTE_SHIFT, chunk[0])
    } else {
      output.push(...encodeBytesWithLatch(chunk))
      currentMode = BYTE
    }
    position += byteCount
  }

  return output
}

function encodeText(bytes) {
  let paths = Array(4).fill(null)
  paths[ALPHA] = []

  for (const byte of bytes) {
    const char = String.fromCharCode(byte)
    const next = Array(4).fill(null)

    for (let source = 0; source < paths.length; source += 1) {
      const path = paths[source]
      if (path === null) continue

      const direct = TEXT_TABLES[source].get(char)
      if (direct !== undefined) updateTextPath(next, source, [...path, direct])

      for (let target = 0; target < TEXT_TABLES.length; target += 1) {
        if (target === source) continue
        const value = TEXT_TABLES[target].get(char)
        if (value === undefined) continue
        updateTextPath(next, target, [...path, ...LATCH_SEQUENCES[source][target], value])
      }

      const punct = TEXT_TABLES[PUNCT].get(char)
      if (source !== PUNCT && punct !== undefined) {
        updateTextPath(next, source, [...path, 29, punct])
      }
      const alpha = TEXT_TABLES[ALPHA].get(char)
      if (source === LOWER && alpha !== undefined) {
        updateTextPath(next, LOWER, [...path, 27, alpha])
      }
    }

    paths = next
  }

  const values = paths
    .filter((path) => path !== null)
    .sort(compareCodewordPaths)[0]
  if (!values) throw new Error('Text compaction cannot encode the supplied data.')

  const padded = values.length % 2 === 0 ? values : [...values, 29]
  const codewords = []
  for (let index = 0; index < padded.length; index += 2) {
    codewords.push(padded[index] * 30 + padded[index + 1])
  }
  return codewords
}

function encodeNumeric(bytes) {
  const digits = String.fromCharCode(...bytes)
  const output = []
  for (let position = 0; position < digits.length; position += 44) {
    let value = BigInt(`1${digits.slice(position, position + 44)}`)
    const chunk = []
    do {
      chunk.push(Number(value % 900n))
      value /= 900n
    } while (value > 0n)
    output.push(...chunk.reverse())
  }
  return output
}

function encodeBytesWithLatch(bytes) {
  const output = [bytes.length % 6 === 0 ? BYTE_LATCH_SIX : BYTE_LATCH]
  const fullGroups = Math.floor(bytes.length / 6)

  for (let group = 0; group < fullGroups; group += 1) {
    let value = 0n
    for (let offset = 0; offset < 6; offset += 1) {
      value = value * 256n + BigInt(bytes[group * 6 + offset])
    }
    const encoded = new Array(5)
    for (let index = 4; index >= 0; index -= 1) {
      encoded[index] = Number(value % 900n)
      value /= 900n
    }
    output.push(...encoded)
  }

  for (let index = fullGroups * 6; index < bytes.length; index += 1) {
    output.push(bytes[index])
  }
  return output
}

function countDigits(bytes, position) {
  let count = 0
  while (position + count < bytes.length && isDigit(bytes[position + count])) count += 1
  return count
}

function countText(bytes, position) {
  let cursor = position
  while (cursor < bytes.length) {
    const digits = countDigits(bytes, cursor)
    if (digits >= 13) break
    if (digits > 0) {
      cursor += digits
      continue
    }
    if (!isTextByte(bytes[cursor])) break
    cursor += 1
  }
  return cursor - position
}

function countBinary(bytes, position) {
  let cursor = position
  while (cursor < bytes.length) {
    if (countDigits(bytes, cursor) >= 13) break
    if (countText(bytes, cursor) >= 5) break
    cursor += 1
  }
  return Math.max(1, cursor - position)
}

function updateTextPath(paths, state, candidate) {
  const current = paths[state]
  if (current === null || compareCodewordPaths(candidate, current) < 0) paths[state] = candidate
}

function compareCodewordPaths(left, right) {
  if (left.length !== right.length) return left.length - right.length
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

function normalizeBytes(data) {
  if (typeof data === 'string') return encoder.encode(data)
  if (data instanceof Uint8Array) return data.slice()
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data).slice()
  if (Array.isArray(data) && data.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    return Uint8Array.from(data)
  }
  throw new TypeError('PDF417 data must be a string, ArrayBuffer, or byte array.')
}

function normalizeMode(mode) {
  const normalized = String(mode ?? 'auto').toLowerCase()
  if (!['auto', 'text', 'byte', 'numeric'].includes(normalized)) {
    throw new Error(`Unsupported PDF417 compaction mode: ${mode}`)
  }
  return normalized
}

function normalizeInitialMode(mode) {
  const normalized = String(mode ?? 'text').toLowerCase()
  if (normalized === 'text') return TEXT
  if (normalized === 'byte') return BYTE
  throw new Error('PDF417 initialMode must be text or byte.')
}

function assertTextBytes(bytes) {
  const invalid = bytes.find((byte) => !isTextByte(byte))
  if (invalid !== undefined) {
    throw new Error(`Text compaction cannot encode byte 0x${invalid.toString(16).padStart(2, '0')}.`)
  }
}

function assertNumericBytes(bytes) {
  if (bytes.some((byte) => !isDigit(byte))) {
    throw new Error('Numeric compaction accepts ASCII digits only.')
  }
}

function isDigit(byte) {
  return byte >= 48 && byte <= 57
}

function isTextByte(byte) {
  return byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)
}

function createCharacterMap(characters, start = 0, extras = []) {
  const map = new Map()
  for (let index = 0; index < characters.length; index += 1) map.set(characters[index], start + index)
  for (const [char, value] of extras) map.set(char, value)
  return map
}
