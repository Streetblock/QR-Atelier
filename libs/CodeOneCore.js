// Code One Version S encoder (AIM USS Code One).
// Algorithm and conformance work adapted from libzint backend/code1.c.
// Copyright (C) 2009-2026 Robin Stuart <rstuart114@gmail.com>
// SPDX-License-Identifier: BSD-3-Clause

const VERSION_S = [
  { name: 'S-10', maxDigits: 6, dataWords: 4, blockWidth: 2 },
  { name: 'S-20', maxDigits: 12, dataWords: 8, blockWidth: 4 },
  { name: 'S-30', maxDigits: 18, dataWords: 12, blockWidth: 6 },
]

export class CodeOneCore {
  constructor(data, options = {}) {
    this.data = data
    this.options = { ...options }
  }

  generate() {
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
  const gf = createGf32(), generator = generatorPoly(degree, gf)
  const message = [...data, ...Array(degree).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const coefficient = message[i]
    if (!coefficient) continue
    const log = gf.log[coefficient]
    for (let j = 0; j < generator.length; j++) {
      const g = generator[j]
      if (g) message[i + j] ^= gf.exp[(log + gf.log[g]) % 31]
    }
  }
  return message.slice(data.length)
}

function createGf32() {
  const exp = Array(32), log = Array(32); let value = 1
  for (let i = 0; i < 32; i++) { exp[i] = value; value <<= 1; if (value >= 32) value = (value ^ 0x25) & 31 }
  for (let i = 0; i < 31; i++) log[exp[i]] = i
  return { exp, log }
}

function generatorPoly(degree, gf) {
  let poly = [1]
  for (let d = 0; d < degree; d++) {
    const root = gf.exp[d % 31], next = Array(poly.length + 1).fill(0)
    for (let i = 0; i < poly.length; i++) { next[i] ^= poly[i]; if (poly[i]) next[i + 1] ^= gf.exp[(gf.log[poly[i]] + gf.log[root]) % 31] }
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
