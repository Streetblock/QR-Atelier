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

export class CodeOneCore {
  constructor(data, options = {}) {
    this.data = data
    this.options = { ...options }
  }

  generate() {
    const requested = this.options.version == null ? null : String(this.options.version).toUpperCase()
    if (requested?.startsWith('T')) return generateVersionT(this.data, requested)

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

function generateVersionT(value, requested) {
  const data = normalizeLatin1(value)
  if (data.length > 90) throw new RangeError('Code One Version T accepts at most 90 Latin-1 characters.')
  const encoded = encodeVersionTData(data)
  const version = chooseVersionT(encoded.length, requested)
  const dataCodewords = [...encoded, ...Array(version.dataWords - encoded.length).fill(129)]
  const checkCodewords = reedSolomonInField(dataCodewords, version.checkWords, 0x12d, 256)
  const codewords = [...dataCodewords, ...checkCodewords]
  const modules = placeVersionT(codewords, version)
  return {
    format: 'CodeOne', family: 'T', version: version.name, data,
    width: modules[0].length, height: modules.length, modules,
    dataCodewords, checkCodewords, codewords,
    encodingMode: selectVersionTMode(data), readyForScan: true,
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

function selectVersionTMode(data) {
  if (/^\d{90}$/.test(data)) return 'decimal'
  if (/^[ A-Z0-9]+$/.test(data)) {
    const remainder = data.length % 3
    const codewordLength = 1 + Math.floor(data.length / 3) * 2 + (remainder === 1 ? 1 : remainder === 2 ? 2 : 0)
    if (VERSION_T.some(version => version.dataWords === codewordLength)) return 'c40'
  }
  return 'ascii'
}

function encodeVersionTData(data) {
  const mode = selectVersionTMode(data)
  if (mode === 'decimal') return encodeDecimal(data)
  if (mode === 'c40') return encodeC40(data)
  return encodeAscii(data)
}

function encodeAscii(data) {
  const codewords = []
  for (let i = 0; i < data.length;) {
    if (i + 1 < data.length && /\d/.test(data[i]) && /\d/.test(data[i + 1])) {
      codewords.push(Number(data.slice(i, i + 2)) + 130)
      i += 2
      continue
    }
    const value = data.charCodeAt(i++)
    if (value > 127) codewords.push(235, value - 127)
    else codewords.push(value + 1)
  }
  return codewords
}

function encodeC40(data) {
  const values = []
  for (const character of data) {
    if (character === ' ') values.push(3)
    else if (/\d/.test(character)) values.push(character.charCodeAt(0) - 44)
    else values.push(character.charCodeAt(0) - 51)
  }
  const codewords = [230]
  let position = 0
  while (position + 2 < values.length) {
    const packed = 1600 * values[position] + 40 * values[position + 1] + values[position + 2] + 1
    codewords.push(packed >> 8, packed & 255)
    position += 3
  }
  const remaining = values.length - position
  if (remaining === 1) codewords.push(data.charCodeAt(position) + 1)
  else if (remaining === 2) {
    const packed = 1600 * values[position] + 40 * values[position + 1] + 1
    codewords.push(packed >> 8, packed & 255)
  }
  return codewords
}

function encodeDecimal(data) {
  let bits = '1111'
  for (let i = 0; i < data.length; i += 3) bits += (Number(data.slice(i, i + 3)) + 1).toString(2).padStart(10, '0')
  if (bits.length % 8 !== 0) throw new Error('Internal Code One decimal alignment error.')
  const codewords = []
  for (let i = 0; i < bits.length; i += 8) codewords.push(Number.parseInt(bits.slice(i, i + 8), 2))
  return codewords
}

function chooseVersionT(length, requested) {
  const minimum = VERSION_T.find(version => length <= version.dataWords)
  if (!minimum) throw new RangeError(`Input requires ${length} codewords; Code One T-48 allows at most 38.`)
  if (requested === 'T') return minimum
  const version = VERSION_T.find(candidate => candidate.name === requested)
  if (!version) throw new RangeError('Supported Code One T versions are T, T-16, T-32 and T-48.')
  if (length > version.dataWords) throw new RangeError(`${requested} accepts at most ${version.dataWords} data codewords; input requires ${length}.`)
  return version
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
