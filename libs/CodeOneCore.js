// Code One Version S encoder (AIM USS Code One).
// Algorithm and conformance work adapted from libzint backend/code1.c.
// Copyright (C) 2009-2026 Robin Stuart <rstuart114@gmail.com>
// SPDX-License-Identifier: BSD-3-Clause

const VERSION_S = [
  { name: 'S-10', maxDigits: 6, dataWords: 4, blockWidth: 2 },
  { name: 'S-20', maxDigits: 12, dataWords: 8, blockWidth: 4 },
  { name: 'S-30', maxDigits: 18, dataWords: 12, blockWidth: 6 },
]

const VERSION_T = [
  { name: 'T-16', dataWords: 10, checkWords: 10, blockWidth: 4 },
  { name: 'T-32', dataWords: 24, checkWords: 16, blockWidth: 8 },
  { name: 'T-48', dataWords: 38, checkWords: 22, blockWidth: 12 },
]

const VERSION_MAIN = [
  { name: 'A', width: 18, height: 16, dataWords: 10, checkWords: 10, blocks: 1, dataBlock: 10, checkBlock: 10, gridWidth: 4, gridHeight: 5 },
  { name: 'B', width: 22, height: 22, dataWords: 19, checkWords: 16, blocks: 1, dataBlock: 19, checkBlock: 16, gridWidth: 5, gridHeight: 7 },
  { name: 'C', width: 32, height: 28, dataWords: 44, checkWords: 26, blocks: 1, dataBlock: 44, checkBlock: 26, gridWidth: 7, gridHeight: 10 },
  { name: 'D', width: 42, height: 40, dataWords: 91, checkWords: 44, blocks: 1, dataBlock: 91, checkBlock: 44, gridWidth: 9, gridHeight: 15 },
  { name: 'E', width: 54, height: 52, dataWords: 182, checkWords: 70, blocks: 1, dataBlock: 182, checkBlock: 70, gridWidth: 12, gridHeight: 21 },
  { name: 'F', width: 76, height: 70, dataWords: 370, checkWords: 140, blocks: 2, dataBlock: 185, checkBlock: 70, gridWidth: 17, gridHeight: 30 },
  { name: 'G', width: 98, height: 104, dataWords: 732, checkWords: 280, blocks: 4, dataBlock: 183, checkBlock: 70, gridWidth: 22, gridHeight: 46 },
  { name: 'H', width: 134, height: 148, dataWords: 1480, checkWords: 560, blocks: 8, dataBlock: 185, checkBlock: 70, gridWidth: 30, gridHeight: 68 },
]

export class CodeOneCore {
  constructor(data, options = {}) {
    this.data = data
    this.options = { ...options }
  }

  generate() {
    const requested = this.options.version == null ? null : String(this.options.version).toUpperCase()
    if (requested?.startsWith('T')) {
      return generateVersionT(this.data, requested, this.options)
    }
    if (requested === 'A-H' || VERSION_MAIN.some(version => version.name === requested)) {
      return generateMainVersion(this.data, requested, this.options)
    }

    rejectUnsupportedControlOptions(this.options, 'S')

    const digits = normalizeDigits(this.data)
    const version = chooseVersion(digits.length, this.options.version)
    const dataWords = numberToWords(BigInt(digits) + 1n, version.dataWords)
    const checkWords = reedSolomon(dataWords, version.dataWords)
    const codewords = [...dataWords, ...checkWords]
    const modules = placeVersionS(codewords, version)
    return {
      format: 'CodeOne', family: 'S', version: version.name, data: digits,
      width: modules[0].length, height: modules.length, modules,
      dataCodewords: dataWords, checkCodewords: checkWords, codewords,
      readyForScan: true,
    }
  }
}

function normalizeDigits(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Code One Version S requires a non-negative safe integer or decimal string.')
    value = String(value)
  }
  if (typeof value !== 'string' || !/^\d{1,18}$/.test(value)) {
    throw new RangeError('Code One Version S requires 1 to 18 decimal digits.')
  }
  return value
}

function chooseVersion(length, requested) {
  if (requested == null || String(requested).toUpperCase() === 'S') return VERSION_S.find(v => length <= v.maxDigits)
  const name = String(requested).toUpperCase()
  const version = VERSION_S.find(v => v.name === name)
  if (!version) throw new RangeError('Supported Code One versions are S, S-10, S-20 and S-30.')
  if (length > version.maxDigits) throw new RangeError(`${name} accepts at most ${version.maxDigits} digits.`)
  return version
}

function numberToWords(value, count) {
  const words = Array(count).fill(0)
  for (let i = count - 1; i >= 0; i--) { words[i] = Number(value & 31n); value >>= 5n }
  if (value) throw new RangeError('Code One Version S value exceeds its selected capacity.')
  return words
}

function reedSolomon(data, degree) {
  return reedSolomonInField(data, degree, 0x25, 32)
}

function reedSolomonInField(data, degree, primitive, size) {
  const gf = createGaloisField(primitive, size), generator = generatorPoly(degree, gf)
  const message = [...data, ...Array(degree).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const coefficient = message[i]
    if (!coefficient) continue
    const log = gf.log[coefficient]
    for (let j = 0; j < generator.length; j++) {
      const g = generator[j]
      if (g) message[i + j] ^= gf.exp[(log + gf.log[g]) % (size - 1)]
    }
  }
  return message.slice(data.length)
}

function createGaloisField(primitive, size) {
  const exp = Array(size), log = Array(size); let value = 1
  for (let i = 0; i < size; i++) {
    exp[i] = value
    value <<= 1
    if (value >= size) value = (value ^ primitive) & (size - 1)
  }
  for (let i = 0; i < size - 1; i++) log[exp[i]] = i
  return { exp, log }
}

function generatorPoly(degree, gf) {
  let poly = [1]
  for (let d = 0; d < degree; d++) {
    const modulus = gf.exp.length - 1
    const root = gf.exp[d % modulus], next = Array(poly.length + 1).fill(0)
    for (let i = 0; i < poly.length; i++) {
      next[i] ^= poly[i]
      if (poly[i]) next[i + 1] ^= gf.exp[(gf.log[poly[i]] + gf.log[root]) % modulus]
    }
    poly = next
  }
  return poly
}

function placeVersionS(codewords, version) {
  const sub = VERSION_S.indexOf(version) + 1, width = sub * 10 + 1
  const modules = Array.from({ length: 8 }, () => Array(width).fill(false))
  const grid = Array.from({ length: 4 }, () => Array(version.blockWidth * 5).fill(false))
  let p = 0
  for (let row = 0; row < 2; row++) for (let col = 0; col < version.blockWidth; col++) {
    const a = codewords[p++], b = codewords[p++]
    grid[row * 2][col * 5] = Boolean(a & 16)
    grid[row * 2][col * 5 + 1] = Boolean(a & 8)
    grid[row * 2][col * 5 + 2] = Boolean(a & 4)
    grid[row * 2 + 1][col * 5] = Boolean(a & 2)
    grid[row * 2 + 1][col * 5 + 1] = Boolean(a & 1)
    grid[row * 2][col * 5 + 3] = Boolean(b & 16)
    grid[row * 2][col * 5 + 4] = Boolean(b & 8)
    grid[row * 2 + 1][col * 5 + 2] = Boolean(b & 4)
    grid[row * 2 + 1][col * 5 + 3] = Boolean(b & 2)
    grid[row * 2 + 1][col * 5 + 4] = Boolean(b & 1)
  }
  const half = sub * 5
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < half; x++) modules[y][x] = grid[y][x]
    for (let x = half; x < sub * 10; x++) modules[y][x + 1] = grid[y][x]
  }
  modules[5].fill(true)
  modules[7].fill(true)
  modules[7][1] = false
  modules[7][width - 2] = false
  modules[6][0] = true
  modules[6][width - 1] = true
  modules[0][half] = true
  if (sub >= 2) modules[4][half] = true
  if (sub === 3) modules[6][half] = true
  return modules
}

function generateVersionT(value, requested, options) {
  const data = normalizeMainData(value, options)
  const controls = createControlPrefix(options, data)
  if (controls.data.length > 90) throw new RangeError('Code One Version T accepts at most 90 encoded characters including ECI escapes.')
  const selection = chooseEncoding(controls.data, VERSION_T, requested, 'T', options.mode, controls.prefix, controls.gs1)
  const { version, encoded, mode } = selection
  const dataCodewords = [...encoded, ...Array(version.dataWords - encoded.length).fill(129)]
  const checkCodewords = reedSolomonInField(dataCodewords, version.checkWords, 0x12d, 256)
  const codewords = [...dataCodewords, ...checkCodewords]
  const modules = placeVersionT(codewords, version)
  return {
    format: 'CodeOne', family: 'T', version: version.name, data: value,
    width: modules[0].length, height: modules.length, modules,
    dataCodewords, checkCodewords, codewords,
    encodingMode: mode, gs1: controls.gs1, eci: controls.eci,
    structuredAppend: controls.structuredAppend, readyForScan: true,
  }
}

function normalizeLatin1(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Code One Version T requires text or a non-negative safe integer.')
    value = String(value)
  }
  if (typeof value !== 'string' || value.length === 0) throw new RangeError('Code One Version T requires non-empty text.')
  for (const character of value) {
    if (character.codePointAt(0) > 255) {
      throw new RangeError('Code One Version T currently supports Latin-1; use a future ECI/Byte mode for other Unicode text.')
    }
  }
  return value
}

function rejectUnsupportedControlOptions(options, family) {
  if (options.gs1 || options.eci != null || options.structuredAppend != null) {
    throw new RangeError(`GS1, ECI and Structured Append are not yet available for Code One Version ${family}.`)
  }
}

function encodeAscii(data, gs1 = false) {
  const codewords = []
  for (let i = 0; i < data.length;) {
    if (i + 1 < data.length && /\d/.test(data[i]) && /\d/.test(data[i + 1])) {
      codewords.push(Number(data.slice(i, i + 2)) + 130)
      i += 2
      continue
    }
    const value = data.charCodeAt(i++)
    if (gs1 && value === 29) codewords.push(232)
    else if (value > 127) codewords.push(235, value - 127)
    else codewords.push(value + 1)
  }
  return codewords
}

function placeVersionT(codewords, version) {
  const sub = VERSION_T.indexOf(version) + 1
  const width = sub * 16 + 1
  const half = sub * 8
  const modules = Array.from({ length: 16 }, () => Array(width).fill(false))
  const grid = Array.from({ length: 10 }, () => Array(version.blockWidth * 4).fill(false))
  let position = 0
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < version.blockWidth; col++) {
      const value = codewords[position++]
      for (let bit = 0; bit < 4; bit++) grid[row * 2][col * 4 + bit] = Boolean(value & (128 >> bit))
      for (let bit = 0; bit < 4; bit++) grid[row * 2 + 1][col * 4 + bit] = Boolean(value & (8 >> bit))
    }
  }
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < half; x++) modules[y][x] = grid[y][x]
    for (let x = half; x < sub * 16; x++) modules[y][x + 1] = grid[y][x]
  }
  modules[11].fill(true)
  modules[13].fill(true)
  modules[15].fill(true)
  modules[12][0] = modules[12][width - 1] = true
  modules[14][0] = modules[14][width - 1] = true
  modules[13][1] = modules[13][width - 2] = false
  modules[15][1] = modules[15][width - 2] = false
  modules[0][half] = modules[10][half] = true
  if (sub >= 2) modules[12][half] = true
  if (sub === 3) modules[14][half] = true
  return modules
}

function generateMainVersion(value, requested, options) {
  const data = normalizeMainData(value, options)
  const controls = createControlPrefix(options, data)
  const selection = chooseMainEncoding(controls.data, requested, options.mode, controls.prefix, controls.gs1)
  const { version, encoded, mode } = selection
  const dataCodewords = [...encoded, ...Array(version.dataWords - encoded.length).fill(129)]
  const checkCodewords = createInterleavedCheckwords(dataCodewords, version)
  const codewords = [...dataCodewords, ...checkCodewords]
  const modules = placeMainVersion(codewords, version)
  return {
    format: 'CodeOne', family: 'A-H', version: version.name, data: value,
    width: version.width, height: version.height, modules,
    dataCodewords, checkCodewords, codewords,
    encodingMode: mode, gs1: controls.gs1, eci: controls.eci,
    structuredAppend: controls.structuredAppend, readyForScan: true,
  }
}

function normalizeMainData(value, options) {
  if (options.encoding == null || String(options.encoding).toLowerCase() === 'latin1') return normalizeLatin1(value)
  if (String(options.encoding).toLowerCase() !== 'utf-8') throw new RangeError('Code One encoding must be latin1 or utf-8.')
  if (options.eci == null) throw new RangeError('Code One UTF-8 encoding requires an ECI assignment.')
  if (typeof value !== 'string' || value.length === 0) throw new RangeError('Code One requires non-empty text.')
  return Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join('')
}

function createControlPrefix(options, data) {
  const gs1 = Boolean(options.gs1)
  const eci = options.eci == null ? null : Number(options.eci)
  const structuredAppend = normalizeStructuredAppend(options.structuredAppend)
  if (gs1 && structuredAppend) throw new RangeError('Code One cannot combine GS1 and Structured Append.')
  if (gs1 && eci != null) throw new RangeError('Code One GS1 mode cannot carry ECI.')
  if (eci != null && (!Number.isInteger(eci) || eci < 0 || eci > 999999)) {
    throw new RangeError('Code One ECI must be an integer from 0 to 999999.')
  }
  if (gs1) return { data, prefix: [232], gs1, eci: null, structuredAppend: null }

  let encodedData = data
  if (eci != null) encodedData = `\\${String(eci).padStart(6, '0')}${data.replaceAll('\\', '\\\\')}`
  let prefix = []
  if (structuredAppend) {
    const { index, count } = structuredAppend
    if (count < 16) {
      prefix = eci != null && index === 1
        ? [129, 233, (index - 1) * 15 + count - 1, 93]
        : [(index - 1) * 15 + count - 1, 233]
    } else {
      prefix = eci != null && index === 1
        ? [129, 93, 233, index, count]
        : [index, count, 233]
    }
  } else if (eci != null) {
    prefix = [129, 93]
  }
  return { data: encodedData, prefix, gs1, eci, structuredAppend }
}

function normalizeStructuredAppend(value) {
  if (value == null) return null
  if (typeof value !== 'object') throw new TypeError('Code One structuredAppend must contain index and count.')
  const { index, count } = value
  if (!Number.isInteger(count) || count < 2 || count > 128) throw new RangeError('Code One Structured Append count must be from 2 to 128.')
  if (!Number.isInteger(index) || index < 1 || index > count) throw new RangeError('Code One Structured Append index must be from 1 to count.')
  return { index, count }
}

function chooseMainEncoding(data, requested, requestedMode, prefix = [], gs1 = false) {
  return chooseEncoding(data, VERSION_MAIN, requested, 'A-H', requestedMode, prefix, gs1)
}

function chooseEncoding(data, allVersions, requested, automaticName, requestedMode, prefix = [], gs1 = false) {
  const mode = requestedMode == null ? 'auto' : String(requestedMode).toLowerCase()
  if (!['auto', 'ascii', 'c40', 'text', 'edi', 'decimal', 'byte'].includes(mode)) {
    throw new RangeError('Code One mode must be auto, ascii, c40, text, edi, decimal or byte.')
  }
  const versions = requested === automaticName
    ? allVersions
    : [allVersions.find(version => version.name === requested)]
  let shortest = Infinity
  for (const version of versions) {
    const remainingCapacity = version.dataWords - prefix.length
    const candidates = remainingCapacity < 1 ? [] : createMainCandidates(data, remainingCapacity, mode, gs1)
      .map(candidate => ({ ...candidate, codewords: [...prefix, ...candidate.codewords] }))
    for (const candidate of candidates) shortest = Math.min(shortest, candidate.codewords.length)
    const fitting = candidates.filter(candidate => candidate.codewords.length <= version.dataWords)
    if (fitting.length) {
      const priority = { mixed: 0, decimal: 1, c40: 2, text: 3, edi: 4, byte: 5, ascii: 6 }
      fitting.sort((left, right) => left.codewords.length - right.codewords.length || priority[left.mode] - priority[right.mode])
      return { version, encoded: fitting[0].codewords, mode: fitting[0].mode }
    }
  }
  const name = requested === automaticName ? `Code One ${versions.at(-1).name}` : `Code One ${requested}`
  const capacity = versions.at(-1).dataWords
  throw new RangeError(`${name} accepts at most ${capacity} data codewords; input requires ${shortest}.`)
}

function createMainCandidates(data, capacity, mode, gs1) {
  const encoders = {
    ascii: () => encodeAscii(data, gs1),
    c40: () => encodeTripletMode(data, capacity, 'c40', gs1),
    text: () => encodeTripletMode(data, capacity, 'text', gs1),
    edi: () => encodeTripletMode(data, capacity, 'edi', gs1),
    decimal: () => encodeMainDecimal(data, capacity),
    byte: () => encodeByte(data, capacity),
  }
  const names = mode === 'auto' ? ['ascii', 'c40', 'text', 'edi', 'decimal', 'byte'] : [mode]
  const candidates = []
  for (const name of names) {
    try { candidates.push({ mode: name, codewords: encoders[name]() }) } catch (error) {
      if (mode !== 'auto') throw error
    }
  }
  if (mode === 'auto') {
    try { candidates.push({ mode: 'mixed', codewords: encodeMixed(data, gs1) }) } catch {}
  }
  return candidates
}

function encodeMixed(data, gs1) {
  const codewords = []
  let position = 0
  let compacted = false
  while (position < data.length) {
    const rest = data.slice(position)
    const decimal = rest.match(/^\d{12,}/)?.[0]
    if (decimal) {
      codewords.push(...encodeMainDecimal(decimal, Infinity))
      position += decimal.length
      compacted = true
      continue
    }

    const byteRun = rest.match(/^[\x80-\xff]{2,}/)?.[0]
    if (byteRun) {
      codewords.push(...encodeByte(byteRun, Infinity))
      position += byteRun.length
      compacted = true
      continue
    }

    const runs = [
      ['c40', rest.match(/^[ A-Z0-9]{6,}/)?.[0]],
      ['text', rest.match(/^[ a-z0-9]{6,}/)?.[0]],
      ['edi', rest.match(/^[\r*> A-Z0-9]{6,}/)?.[0]],
    ].map(([tripletMode, run]) => {
      const decimalStart = run?.search(/\d{12,}/) ?? -1
      return [tripletMode, decimalStart > 0 ? run.slice(0, decimalStart) : run]
    })
    const selected = runs.find(([, run]) => run)
    if (selected) {
      const [tripletMode, run] = selected
      const length = run.length - run.length % 3
      if (length >= 3) {
        codewords.push(...encodeClosedTripletSegment(run.slice(0, length), tripletMode))
        position += length
        compacted = true
        continue
      }
    }

    if (position + 1 < data.length && /\d/.test(data[position]) && /\d/.test(data[position + 1])) {
      codewords.push(Number(data.slice(position, position + 2)) + 130)
      position += 2
    } else {
      codewords.push(...encodeAscii(data[position], gs1))
      position++
    }
  }
  if (!compacted) throw new RangeError('No compact Code One segments found.')
  return codewords
}

function encodeClosedTripletSegment(data, mode) {
  const latch = mode === 'c40' ? 230 : mode === 'text' ? 239 : 238
  const values = [...data].flatMap(character => mode === 'edi'
    ? [ediValue(character, false)]
    : c40TextValues(character, mode, false))
  if (values.length % 3 !== 0) throw new Error('Internal Code One triplet alignment error.')
  const codewords = [latch]
  for (let index = 0; index < values.length; index += 3) {
    appendTriplet(codewords, values[index], values[index + 1], values[index + 2])
  }
  codewords.push(255)
  return codewords
}

function encodeTripletMode(data, capacity, mode, gs1 = false) {
  const definitions = {
    c40: { latch: 230, values: character => c40TextValues(character, 'c40', gs1) },
    text: { latch: 239, values: character => c40TextValues(character, 'text', gs1) },
    edi: { latch: 238, values: character => [ediValue(character, gs1)] },
  }
  const definition = definitions[mode]
  const characters = [...data]
  const groups = characters.map(definition.values)
  const values = groups.flat()
  const packedCodewords = [definition.latch]
  let valuePosition = 0
  while (valuePosition + 2 < values.length) {
    appendTriplet(packedCodewords, values[valuePosition], values[valuePosition + 1], values[valuePosition + 2])
    valuePosition += 3
  }
  const remaining = values.length - valuePosition
  const room = capacity - packedCodewords.length
  if (remaining === 0) {
    if (packedCodewords.length < capacity) packedCodewords.push(255)
    return packedCodewords
  }
  if (remaining === 1 && room === 1 && groups.at(-1).length === 1) {
    packedCodewords.push(...encodeAscii(characters.at(-1), gs1))
    return packedCodewords
  } else if (remaining === 2 && room === 2) {
    appendTriplet(packedCodewords, values[valuePosition], values[valuePosition + 1], 0)
    return packedCodewords
  }

  let characterPosition = groups.length
  let prefixValueCount = values.length
  while (characterPosition > 0 && prefixValueCount % 3 !== 0) prefixValueCount -= groups[--characterPosition].length
  const codewords = [definition.latch]
  for (let index = 0; index < prefixValueCount; index += 3) {
    appendTriplet(codewords, values[index], values[index + 1], values[index + 2])
  }
  codewords.push(255, ...encodeAscii(characters.slice(characterPosition).join(''), gs1))
  return codewords
}

function appendTriplet(codewords, first, second, third) {
  const packed = 1600 * first + 40 * second + third + 1
  codewords.push(packed >> 8, packed & 255)
}

function c40TextValues(character, mode, gs1) {
  const value = character.charCodeAt(0)
  if (gs1 && value === 29) return [1, 27]
  if (value >= 128) return [1, 30, ...c40TextValues(String.fromCharCode(value - 128), mode, false)]
  if (value === 32) return [3]
  if (value >= 48 && value <= 57) return [value - 44]
  if (mode === 'c40' && value >= 65 && value <= 90) return [value - 51]
  if (mode === 'text' && value >= 97 && value <= 122) return [value - 83]
  if (value <= 31) return [0, value]
  if (value >= 33 && value <= 47) return [1, value - 33]
  if (value >= 58 && value <= 64) return [1, value - 43]
  if (value >= 91 && value <= 95) return [1, value - 69]
  if (mode === 'c40') return [2, value - 96]
  if (value === 96) return [2, 0]
  if (value >= 65 && value <= 90) return [2, value - 64]
  return [2, value - 96]
}

function ediValue(character, gs1) {
  if (gs1 && character.charCodeAt(0) === 29) throw new RangeError('Code One EDI mode cannot encode an inline GS1 separator.')
  if (character === '\r') return 0
  if (character === '*') return 1
  if (character === '>') return 2
  if (character === ' ') return 3
  if (/\d/.test(character)) return character.charCodeAt(0) - 44
  if (/^[A-Z]$/.test(character)) return character.charCodeAt(0) - 51
  throw new RangeError('Code One EDI mode accepts CR, space, *, >, digits and uppercase letters.')
}

function encodeByte(data, capacity) {
  const bytes = [...data].map(character => character.charCodeAt(0))
  const length = bytes.length
  if (length <= 249) return [231, length + 2 === capacity ? 0 : length, ...bytes]
  return [231, 249 + Math.floor(length / 250), length % 250, ...bytes]
}

function encodeMainDecimal(data, capacity) {
  if (!/^\d+$/.test(data)) throw new RangeError('Code One Decimal mode requires decimal digits.')
  const codewords = []
  let bits = '1111'
  const flush = () => {
    while (bits.length >= 8) {
      codewords.push(Number.parseInt(bits.slice(0, 8), 2))
      bits = bits.slice(8)
    }
  }
  let position = 0
  while (position + 2 < data.length) {
    bits += (Number(data.slice(position, position + 3)) + 1).toString(2).padStart(10, '0')
    flush()
    position += 3
  }
  const remaining = data.length - position
  if (remaining) {
    bits += '111111'
    flush()
    const bitsLeft = (8 - bits.length) & 7
    if (bitsLeft >= 4) {
      bits += (Number(data[position]) + 1).toString(2).padStart(4, '0')
      position++
      if (bitsLeft === 6) bits += '01'
      flush()
    } else if (bitsLeft) {
      if (bitsLeft >= 4) bits += '1111'
      if (bitsLeft === 2 || bitsLeft === 6) bits += '01'
      flush()
    }
    codewords.push(...encodeAscii(data.slice(position)))
  } else {
    if (capacity - codewords.length > 1) bits += '111111'
    flush()
    const bitsLeft = (8 - bits.length) & 7
    if (bitsLeft === 4 || bitsLeft === 6) bits += '1111'
    if (bitsLeft === 2 || bitsLeft === 6) bits += '01'
    flush()
  }
  return codewords
}

function createInterleavedCheckwords(data, version) {
  const result = Array(version.checkWords)
  for (let block = 0; block < version.blocks; block++) {
    const blockData = Array.from({ length: version.dataBlock }, (_, index) => data[index * version.blocks + block])
    const blockCheck = reedSolomonInField(blockData, version.checkBlock, 0x12d, 256)
    for (let index = 0; index < version.checkBlock; index++) result[index * version.blocks + block] = blockCheck[index]
  }
  return result
}

function placeMainVersion(codewords, version) {
  const modules = Array.from({ length: version.height }, () => Array(version.width).fill(false))
  const grid = Array.from({ length: version.gridHeight * 2 }, () => Array(version.gridWidth * 4).fill(false))
  let position = 0
  for (let row = 0; row < version.gridHeight; row++) {
    for (let col = 0; col < version.gridWidth; col++) {
      const value = codewords[position++]
      for (let bit = 0; bit < 4; bit++) grid[row * 2][col * 4 + bit] = Boolean(value & (128 >> bit))
      for (let bit = 0; bit < 4; bit++) grid[row * 2 + 1][col * 4 + bit] = Boolean(value & (8 >> bit))
    }
  }
  addMainFinder(modules, grid, version.name)
  return modules
}

function addMainFinder(modules, grid, name) {
  const copy = (startRow, startCol, height, width, rowOffset, colOffset) => {
    for (let row = startRow; row < startRow + height; row++) {
      for (let col = startCol; col < startCol + width; col++) {
        if (grid[row][col]) modules[row + rowOffset][col + colOffset] = true
      }
    }
  }
  const horizontal = (row, full) => {
    for (let col = full ? 0 : 1; col < modules[0].length - (full ? 0 : 1); col++) modules[row][col] = true
  }
  const central = (startRow, rowCount, fullRows) => {
    for (let index = 0; index < rowCount; index++) {
      horizontal(startRow + index * 2, index < fullRows)
      if (index >= fullRows && index !== rowCount - 1) {
        modules[startRow + index * 2 + 1][1] = true
        modules[startRow + index * 2 + 1][modules[0].length - 2] = true
      }
    }
  }
  const vertical = (topCol, topHeight, bottomCol, bottomHeight) => {
    for (let row = 0; row < topHeight; row++) modules[row][topCol] = true
    for (let row = 0; row < bottomHeight; row++) modules[modules.length - row - 1][bottomCol] = true
  }
  const spigot = (topRow, bottomRow) => {
    for (let col = modules[0].length - 1; col > 0; col--) {
      if (modules[topRow][col - 1]) modules[topRow][col] = true
      if (modules[bottomRow][col - 1]) modules[bottomRow][col] = true
    }
  }

  if (name === 'A') {
    central(6, 3, 1); vertical(4, 6, 12, 5); modules[5][12] = true; spigot(0, 15)
    copy(0, 0, 5, 4, 0, 0); copy(0, 4, 5, 12, 0, 2); copy(5, 0, 5, 12, 6, 0); copy(5, 12, 5, 4, 6, 2)
  } else if (name === 'B') {
    central(8, 4, 1); vertical(4, 8, 16, 7); modules[7][16] = true; spigot(0, 21)
    copy(0, 0, 7, 4, 0, 0); copy(0, 4, 7, 16, 0, 2); copy(7, 0, 7, 16, 8, 0); copy(7, 16, 7, 4, 8, 2)
  } else if (name === 'C') {
    central(11, 4, 2); vertical(4, 11, 4, 10); vertical(26, 13, 26, 10); spigot(0, 27)
    copy(0, 0, 10, 4, 0, 0); copy(0, 4, 10, 20, 0, 2); copy(0, 24, 10, 4, 0, 4)
    copy(10, 0, 10, 4, 8, 0); copy(10, 4, 10, 20, 8, 2); copy(10, 24, 10, 4, 8, 4)
  } else if (name === 'D') {
    central(16, 5, 1); vertical(4, 16, 4, 15); vertical(20, 16, 20, 15); vertical(36, 16, 36, 15); spigot(0, 27); spigot(12, 39)
    copy(0, 0, 15, 4, 0, 0); copy(0, 4, 15, 14, 0, 2); copy(0, 18, 15, 14, 0, 4); copy(0, 32, 15, 4, 0, 6)
    copy(15, 0, 15, 4, 10, 0); copy(15, 4, 15, 14, 10, 2); copy(15, 18, 15, 14, 10, 4); copy(15, 32, 15, 4, 10, 6)
  } else if (name === 'E') {
    central(22, 5, 2); vertical(4, 22, 4, 21); vertical(26, 24, 26, 21); vertical(48, 22, 48, 21); spigot(0, 39); spigot(12, 51)
    copy(0, 0, 21, 4, 0, 0); copy(0, 4, 21, 20, 0, 2); copy(0, 24, 21, 20, 0, 4); copy(0, 44, 21, 4, 0, 6)
    copy(21, 0, 21, 4, 10, 0); copy(21, 4, 21, 20, 10, 2); copy(21, 24, 21, 20, 10, 4); copy(21, 44, 21, 4, 10, 6)
  } else if (name === 'F') {
    central(31, 5, 3); vertical(4, 31, 4, 30); vertical(26, 35, 26, 30); vertical(48, 31, 48, 30); vertical(70, 35, 70, 30)
    for (let row = 0; row <= 24; row += 12) spigot(row, row + 45)
    copy(0, 0, 30, 4, 0, 0); copy(0, 64, 30, 4, 0, 8); copy(30, 0, 30, 4, 10, 0); copy(30, 64, 30, 4, 10, 8)
    for (let col = 4, offset = 2; col <= 44; col += 20, offset += 2) { copy(0, col, 30, 20, 0, offset); copy(30, col, 30, 20, 10, offset) }
  } else if (name === 'G') {
    central(47, 6, 2); vertical(6, 47, 6, 46); vertical(27, 49, 27, 46); vertical(48, 47, 48, 46); vertical(69, 49, 69, 46); vertical(90, 47, 90, 46)
    for (let row = 0; row <= 36; row += 12) spigot(row, row + 67)
    copy(0, 0, 46, 6, 0, 0); copy(0, 82, 46, 6, 0, 10); copy(46, 0, 46, 6, 12, 0); copy(46, 82, 46, 6, 12, 10)
    for (let col = 6, offset = 2; col <= 63; col += 19, offset += 2) { copy(0, col, 46, 19, 0, offset); copy(46, col, 46, 19, 12, offset) }
  } else {
    central(69, 6, 3); vertical(6, 69, 6, 68); vertical(26, 73, 26, 68); vertical(46, 69, 46, 68); vertical(66, 73, 66, 68); vertical(86, 69, 86, 68); vertical(106, 73, 106, 68); vertical(126, 69, 126, 68)
    for (let row = 0; row <= 60; row += 12) spigot(row, row + 87)
    copy(0, 0, 68, 6, 0, 0); copy(0, 114, 68, 6, 0, 14); copy(68, 0, 68, 6, 12, 0); copy(68, 114, 68, 6, 12, 14)
    for (let col = 6, offset = 2; col <= 96; col += 18, offset += 2) { copy(0, col, 68, 18, 0, offset); copy(68, col, 68, 18, 12, offset) }
  }
}
