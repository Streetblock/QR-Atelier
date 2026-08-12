// ==========================================
// MaxiCodeCore.js - Dependency-free MaxiCode generator
// ==========================================

const MAXICODE_WIDTH = 30
const MAXICODE_HEIGHT = 33
let MAXICODE_FIELD_64 = null

const MAXICODE_CHARSETS = [
  '\rABCDEFGHIJKLMNOPQRSTUVWXYZ' + '\uFFFA' + '\u001C' + '\u001D' + '\u001E' + '\uFFFB' + ' ' + '\uFFFC' + '"#$%&\'()*+,-./0123456789:' + '\uFFF1' + '\uFFF2' + '\uFFF3' + '\uFFF4' + '\uFFF8',
  '`abcdefghijklmnopqrstuvwxyz' + '\uFFFA' + '\u001C' + '\u001D' + '\u001E' + '\uFFFB' + '{' + '\uFFFC' + '}~\u007F;<=>?[\\]^_ ,./:@!|' + '\uFFFC' + '\uFFF5' + '\uFFF6' + '\uFFFC' + '\uFFF0' + '\uFFF2' + '\uFFF3' + '\uFFF4' + '\uFFF7',
  '\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D7\u00D8\u00D9\u00DA' + '\uFFFA' + '\u001C' + '\u001D' + '\u001E' + '\uFFFB' + '\u00DB\u00DC\u00DD\u00DE\u00DF\u00AA\u00AC\u00B1\u00B2\u00B3\u00B5\u00B9\u00BA\u00BC\u00BD\u00BE\u0080\u0081\u0082\u0083\u0084\u0085\u0086\u0087\u0088\u0089' + '\uFFF7' + ' ' + '\uFFF9' + '\uFFF3' + '\uFFF4' + '\uFFF8',
  '\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F7\u00F8\u00F9\u00FA' + '\uFFFA' + '\u001C' + '\u001D' + '\u001E' + '\uFFFB' + '\u00FB\u00FC\u00FD\u00FE\u00FF\u00A1\u00A8\u00AB\u00AF\u00B0\u00B4\u00B7\u00B8\u00BB\u00BF\u008A\u008B\u008C\u008D\u008E\u008F\u0090\u0091\u0092\u0093\u0094' + '\uFFF7' + ' ' + '\uFFF2' + '\uFFF9' + '\uFFF4' + '\uFFF8',
  '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009\n\u000B\u000C\r\u000E\u000F\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001A' + '\uFFFA' + '\uFFFC' + '\uFFFC' + '\u001B' + '\uFFFB' + '\u001C' + '\u001D' + '\u001E' + '\u001F\u009F\u00A0\u00A2\u00A3\u00A4\u00A5\u00A6\u00A7\u00A9\u00AD\u00AE\u00B6\u0095\u0096\u0097\u0098\u0099\u009A\u009B\u009C\u009D\u009E' + '\uFFF7' + ' ' + '\uFFF2' + '\uFFF3' + '\uFFF9' + '\uFFF8',
]

const CHARSET_MAPS = MAXICODE_CHARSETS.map((charset) => {
  const map = new Map()
  for (let i = 0; i < charset.length; i += 1) {
    if (!map.has(charset[i])) map.set(charset[i], i)
  }
  return map
})

const CONTROL = {
  LATCH_A: '\uFFF7',
  LATCH_B: '\uFFF8',
  LATCH_LOCK: '\uFFF9',
  ECI: '\uFFFA',
  NS: '\uFFFB',
  PAD: '\uFFFC',
  SHIFT_A: '\uFFF0',
  SHIFT_B: '\uFFF1',
  SHIFT_C: '\uFFF2',
  SHIFT_D: '\uFFF3',
  SHIFT_E: '\uFFF4',
  SHIFT_2_A: '\uFFF5',
  SHIFT_3_A: '\uFFF6',
}

const LATCH_TO_SET = {
  0: CONTROL.LATCH_A,
  1: CONTROL.LATCH_B,
}

const SET_TO_SHIFT = {
  0: CONTROL.SHIFT_A,
  1: CONTROL.SHIFT_B,
  2: CONTROL.SHIFT_C,
  3: CONTROL.SHIFT_D,
  4: CONTROL.SHIFT_E,
}

const MESSAGE_LENGTH = 93
const ENHANCED_EC_MESSAGE_LENGTH = 77
const CARRIER_MESSAGE_LENGTH = 84
const PRIMARY_LENGTH = 10
const PRIMARY_EC_LENGTH = 10
const STANDARD_TAIL_PROFILE = Object.freeze({ dataLength: 84, ecLength: 40 })
const ENHANCED_TAIL_PROFILE = Object.freeze({ dataLength: 68, ecLength: 56 })

export class MaxiCodeCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string') {
      throw new Error('MaxiCode data must be a string.')
    }

    this.data = data
    this.options = {
      mode: 4,
      preserveControls: false,
      ...options,
    }
  }

  generate() {
    const mode = this.#normalizeMode(this.options.mode)
    const messageLength = mode === 2 || mode === 3
      ? CARRIER_MESSAGE_LENGTH
      : mode === 5 ? ENHANCED_EC_MESSAGE_LENGTH : MESSAGE_LENGTH
    const message = this.#encodeMessage(this.data, messageLength, mode)
    const payload = mode === 2 || mode === 3
      ? this.#buildCarrierPayload(mode, message)
      : this.#buildPayload(mode, message)
    const codewords = this.#buildCodewords(payload, mode)
    const modules = this.#codewordsToModules(codewords)

    return {
      data: this.data,
      mode,
      size: MAXICODE_HEIGHT,
      width: MAXICODE_WIDTH,
      codewords,
      modules,
    }
  }

  #normalizeMode(mode) {
    const numeric = Number(mode)
    if (![2, 3, 4, 5].includes(numeric)) {
      throw new Error('This build currently supports MaxiCode modes 2, 3, 4 and 5.')
    }
    return numeric
  }

  #encodeMessage(text, maximumLength, mode) {
    const source = String(text)
    const normalized = this.options.preserveControls
      ? source
      : source
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, ' ')

    const characters = Array.from(normalized, (char) => !this.options.preserveControls && char === '\t' ? ' ' : char)
    const { codewords, finalSet } = this.#segmentMessage(characters)

    if (codewords.length > maximumLength) {
      throw new Error(`MaxiCode mode ${mode} supports up to ${maximumLength} codewords of message data.`)
    }

    let paddingSet = finalSet
    if (!CHARSET_MAPS[paddingSet].has(CONTROL.PAD) && codewords.length < maximumLength) {
      codewords.push(...this.#latchSequence(paddingSet, 0))
      paddingSet = 0
    }
    if (codewords.length > maximumLength) {
      throw new Error(`MaxiCode mode ${mode} supports up to ${maximumLength} codewords of message data.`)
    }

    const padCodeword = CHARSET_MAPS[paddingSet].get(CONTROL.PAD)
    while (codewords.length < maximumLength) {
      codewords.push(padCodeword)
    }

    return codewords
  }

  #segmentMessage(characters) {
    const paths = Array.from({ length: characters.length + 1 }, () => Array(CHARSET_MAPS.length).fill(null))
    paths[0][0] = []

    const update = (position, set, candidate) => {
      const current = paths[position][set]
      if (current === null || candidate.length < current.length) paths[position][set] = candidate
    }

    for (let position = 0; position < characters.length; position += 1) {
      for (let currentSet = 0; currentSet < CHARSET_MAPS.length; currentSet += 1) {
        const path = paths[position][currentSet]
        if (path === null) continue

        if (this.#hasNineDigits(characters, position)) {
          update(position + 9, currentSet, [...path, ...this.#numericCodewords(characters, position, currentSet)])
        }

        const char = characters[position]
        for (let targetSet = 0; targetSet < CHARSET_MAPS.length; targetSet += 1) {
          const charCodeword = CHARSET_MAPS[targetSet].get(char)
          if (charCodeword === undefined) continue

          if (targetSet === currentSet) {
            update(position + 1, currentSet, [...path, charCodeword])
          } else {
            update(position + 1, targetSet, [
              ...path,
              ...this.#latchSequence(currentSet, targetSet),
              charCodeword,
            ])
            const shift = SET_TO_SHIFT[targetSet]
            if (shift && CHARSET_MAPS[currentSet].has(shift)) {
              update(position + 1, currentSet, [
                ...path,
                this.#codewordForControl(currentSet, shift),
                charCodeword,
              ])
            }
          }
        }

        if (currentSet === 1) {
          for (const length of [2, 3]) {
            const chars = characters.slice(position, position + length)
            if (chars.length !== length || chars.some((item) => !CHARSET_MAPS[0].has(item))) continue
            const control = length === 2 ? CONTROL.SHIFT_2_A : CONTROL.SHIFT_3_A
            update(position + length, currentSet, [
              ...path,
              this.#codewordForControl(currentSet, control),
              ...chars.map((item) => CHARSET_MAPS[0].get(item)),
            ])
          }
        }
      }
    }

    let best = null
    let finalSet = 0
    for (let set = 0; set < CHARSET_MAPS.length; set += 1) {
      const path = paths[characters.length][set]
      if (path !== null && (best === null || path.length < best.length)) {
        best = path
        finalSet = set
      }
    }
    if (best === null) {
      const unsupported = characters.find((char) => !CHARSET_MAPS.some((map) => map.has(char)))
      throw new Error(`MaxiCode cannot encode character: ${JSON.stringify(unsupported)}`)
    }
    return { codewords: best, finalSet }
  }

  #hasNineDigits(characters, position) {
    if (position + 9 > characters.length) return false
    for (let index = position; index < position + 9; index += 1) {
      if (!/^[0-9]$/.test(characters[index])) return false
    }
    return true
  }

  #numericCodewords(characters, position, currentSet) {
    const value = Number(characters.slice(position, position + 9).join(''))
    return [
      this.#codewordForControl(currentSet, CONTROL.NS),
      (value >>> 24) & 0x3f,
      (value >>> 18) & 0x3f,
      (value >>> 12) & 0x3f,
      (value >>> 6) & 0x3f,
      value & 0x3f,
    ]
  }

  #latchSequence(currentSet, targetSet) {
    if (currentSet === targetSet) return []
    if (targetSet === 0 || targetSet === 1) {
      return [this.#codewordForControl(currentSet, LATCH_TO_SET[targetSet])]
    }
    const shift = SET_TO_SHIFT[targetSet]
    return [
      this.#codewordForControl(currentSet, shift),
      this.#codewordForControl(targetSet, CONTROL.LATCH_LOCK),
    ]
  }

  #codewordForControl(currentSet, controlChar) {
    const index = CHARSET_MAPS[currentSet].get(controlChar)
    if (index === undefined) {
      throw new Error(`MaxiCode control ${JSON.stringify(controlChar)} is not valid in set ${currentSet}.`)
    }
    return index
  }

  #buildPayload(mode, messageCodewords) {
    const payload = new Uint8Array(94)
    payload[0] = mode
    payload.set(messageCodewords, 1)
    return payload
  }

  #buildCarrierPayload(mode, messageCodewords) {
    const payload = new Uint8Array(94)
    payload.set(this.#buildPrimaryMessage(mode), 0)
    payload.set(messageCodewords, 10)
    return payload
  }

  #buildPrimaryMessage(mode) {
    const primary = new Uint8Array(10)
    primary[0] = mode

    const countryCode = this.#parseThreeDigitField(this.options.countryCode, 'ISO country code')
    const serviceClass = this.#parseThreeDigitField(this.options.serviceClass, 'service class')

    if (mode === 2) {
      let postalCode = String(this.options.postalCode ?? '')
      if (!/^\d{1,9}$/.test(postalCode)) {
        throw new Error('MaxiCode mode 2 postal code must contain 1 to 9 digits.')
      }
      // ISO/IEC 16023 Annex B.1: for country code 840, an unknown ZIP+4
      // extension is represented by four trailing zeroes.
      if (countryCode === 840 && postalCode.length === 5) postalCode += '0000'
      this.#setIntAtPositions(primary, [33, 34, 35, 36, 25, 26, 27, 28, 29, 30, 19, 20, 21, 22, 23, 24, 13, 14, 15, 16, 17, 18, 7, 8, 9, 10, 11, 12, 1, 2], Number(postalCode))
      this.#setIntAtPositions(primary, [39, 40, 41, 42, 31, 32], postalCode.length)
    } else {
      const postalCode = String(this.options.postalCode ?? '').toUpperCase()
      if (!/^[A-Z0-9 ]{6}$/.test(postalCode)) {
        throw new Error('MaxiCode mode 3 postal code must contain exactly 6 alphanumeric characters.')
      }
      const positions = [
        [39, 40, 41, 42, 31, 32],
        [33, 34, 35, 36, 25, 26],
        [27, 28, 29, 30, 19, 20],
        [21, 22, 23, 24, 13, 14],
        [15, 16, 17, 18, 7, 8],
        [9, 10, 11, 12, 1, 2],
      ]
      for (let index = 0; index < postalCode.length; index += 1) {
        this.#setIntAtPositions(primary, positions[index], CHARSET_MAPS[0].get(postalCode[index]))
      }
    }

    this.#setIntAtPositions(primary, [53, 54, 43, 44, 45, 46, 47, 48, 37, 38], countryCode)
    this.#setIntAtPositions(primary, [55, 56, 57, 58, 59, 60, 49, 50, 51, 52], serviceClass)
    return primary
  }

  #parseThreeDigitField(value, label) {
    const text = String(value ?? '')
    if (!/^\d{3}$/.test(text)) {
      throw new Error(`MaxiCode ${label} must contain exactly 3 digits.`)
    }
    return Number(text)
  }

  #setIntAtPositions(bytes, positions, value) {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** positions.length) {
      throw new Error(`Value ${value} does not fit in ${positions.length} MaxiCode bits.`)
    }
    for (let index = 0; index < positions.length; index += 1) {
      const bitNumber = positions[index] - 1
      const byteIndex = Math.floor(bitNumber / 6)
      const bitMask = 1 << (5 - (bitNumber % 6))
      const bit = (value >> (positions.length - index - 1)) & 1
      if (bit) bytes[byteIndex] |= bitMask
      else bytes[byteIndex] &= ~bitMask
    }
  }

  #buildCodewords(payload, mode) {
    const tailProfile = mode === 5 ? ENHANCED_TAIL_PROFILE : STANDARD_TAIL_PROFILE
    const streamDataLength = tailProfile.dataLength / 2
    const streamEcLength = tailProfile.ecLength / 2
    const codewords = new Uint8Array(144)
    codewords.set(payload.slice(0, PRIMARY_LENGTH), 0)
    codewords.set(payload.slice(PRIMARY_LENGTH, PRIMARY_LENGTH + tailProfile.dataLength), 20)

    this.#encodeReedSolomon(codewords.subarray(0, PRIMARY_LENGTH + PRIMARY_EC_LENGTH), PRIMARY_EC_LENGTH)

    const evenData = new Array(streamDataLength)
    const oddData = new Array(streamDataLength)
    for (let i = 0; i < tailProfile.dataLength; i += 1) {
      const value = codewords[20 + i]
      if (i % 2 === 0) {
        evenData[i / 2] = value
      } else {
        oddData[(i - 1) / 2] = value
      }
    }

    const evenStream = new Uint8Array(streamDataLength + streamEcLength)
    const oddStream = new Uint8Array(streamDataLength + streamEcLength)
    evenStream.set(evenData, 0)
    oddStream.set(oddData, 0)
    this.#encodeReedSolomon(evenStream, streamEcLength)
    this.#encodeReedSolomon(oddStream, streamEcLength)

    for (let i = 0; i < streamDataLength + streamEcLength; i += 1) {
      codewords[20 + i * 2] = evenStream[i]
      codewords[21 + i * 2] = oddStream[i]
    }

    return codewords
  }

  #encodeReedSolomon(codewords, ecLength) {
    const encoder = new ReedSolomonEncoder(MAXICODE_FIELD_64)
    const ints = Int32Array.from(codewords)
    encoder.encode(ints, ecLength)
    codewords.set(ints)
  }

  #codewordsToModules(codewords) {
    const modules = Array.from({ length: MAXICODE_HEIGHT }, () => Array(MAXICODE_WIDTH).fill(false))
    for (let y = 0; y < MAXICODE_HEIGHT; y += 1) {
      const row = MAXICODE_BITNR[y]
      for (let x = 0; x < MAXICODE_WIDTH; x += 1) {
        const bit = row[x]
        if (bit >= 0 && (codewords[Math.floor(bit / 6)] & (1 << (5 - (bit % 6))))) {
          modules[y][x] = true
        }
      }
    }
    return modules
  }
}

class GenericGFPoly {
  constructor(field, coefficients) {
    if (!coefficients.length) {
      throw new Error('Empty polynomial')
    }
    this.field = field
    if (coefficients.length > 1 && coefficients[0] === 0) {
      let firstNonZero = 1
      while (firstNonZero < coefficients.length && coefficients[firstNonZero] === 0) firstNonZero += 1
      this.coefficients = firstNonZero === coefficients.length ? [0] : coefficients.slice(firstNonZero)
    } else {
      this.coefficients = coefficients
    }
  }

  getDegree() {
    return this.coefficients.length - 1
  }

  isZero() {
    return this.coefficients[0] === 0
  }

  multiply(other) {
    if (this.field !== other.field) throw new Error('Field mismatch')
    if (this.isZero() || other.isZero()) return this.field.getZero()
    const product = new Array(this.coefficients.length + other.coefficients.length - 1).fill(0)
    for (let i = 0; i < this.coefficients.length; i += 1) {
      const aCoeff = this.coefficients[i]
      for (let j = 0; j < other.coefficients.length; j += 1) {
        product[i + j] = GenericGF.addOrSubtract(product[i + j], this.field.multiply(aCoeff, other.coefficients[j]))
      }
    }
    return new GenericGFPoly(this.field, product)
  }

  multiplyByMonomial(degree, coefficient) {
    if (degree < 0) throw new Error('degree < 0')
    if (coefficient === 0) return this.field.getZero()
    const product = new Array(this.coefficients.length + degree).fill(0)
    for (let i = 0; i < this.coefficients.length; i += 1) {
      product[i] = this.field.multiply(this.coefficients[i], coefficient)
    }
    return new GenericGFPoly(this.field, product)
  }

  divide(other) {
    if (other.isZero()) throw new Error('Divide by 0')

    let quotient = this.field.getZero()
    let remainder = this
    const denominatorLeadingTerm = other.getCoefficient(other.getDegree())
    const inverseDenominatorLeadingTerm = this.field.inverse(denominatorLeadingTerm)

    while (remainder.getDegree() >= other.getDegree() && !remainder.isZero()) {
      const degreeDifference = remainder.getDegree() - other.getDegree()
      const scale = this.field.multiply(remainder.getCoefficient(remainder.getDegree()), inverseDenominatorLeadingTerm)
      const term = other.multiplyByMonomial(degreeDifference, scale)
      const iterationQuotient = this.field.buildMonomial(degreeDifference, scale)
      quotient = quotient.addOrSubtract(iterationQuotient)
      remainder = remainder.addOrSubtract(term)
    }

    return [quotient, remainder]
  }

  addOrSubtract(other) {
    if (this.field !== other.field) throw new Error('Field mismatch')
    if (this.isZero()) return other
    if (other.isZero()) return this

    let smaller = this.coefficients
    let larger = other.coefficients
    if (smaller.length > larger.length) {
      ;[smaller, larger] = [larger, smaller]
    }

    const sumDiff = new Array(larger.length).fill(0)
    const lengthDiff = larger.length - smaller.length
    for (let i = 0; i < lengthDiff; i += 1) sumDiff[i] = larger[i]
    for (let i = lengthDiff; i < larger.length; i += 1) {
      sumDiff[i] = GenericGF.addOrSubtract(smaller[i - lengthDiff], larger[i])
    }
    return new GenericGFPoly(this.field, sumDiff)
  }

  getCoefficient(degree) {
    return this.coefficients[this.coefficients.length - 1 - degree]
  }
}

class GenericGF {
  constructor(primitive, size, generatorBase) {
    this.primitive = primitive
    this.size = size
    this.generatorBase = generatorBase
    this.expTable = new Array(size)
    this.logTable = new Array(size)
    let x = 1
    for (let i = 0; i < size; i += 1) {
      this.expTable[i] = x
      x *= 2
      if (x >= size) {
        x ^= primitive
        x &= size - 1
      }
    }
    for (let i = 0; i < size - 1; i += 1) {
      this.logTable[this.expTable[i]] = i
    }
    this.zero = new GenericGFPoly(this, [0])
    this.one = new GenericGFPoly(this, [1])
  }

  static addOrSubtract(a, b) {
    return a ^ b
  }

  getZero() {
    return this.zero
  }

  getOne() {
    return this.one
  }

  buildMonomial(degree, coefficient) {
    if (degree < 0) throw new Error('degree < 0')
    if (coefficient === 0) return this.zero
    const coefficients = new Array(degree + 1).fill(0)
    coefficients[0] = coefficient
    return new GenericGFPoly(this, coefficients)
  }

  exp(a) {
    return this.expTable[a]
  }

  inverse(a) {
    if (a === 0) throw new Error('inverse(0)')
    return this.expTable[this.size - this.logTable[a] - 1]
  }

  multiply(a, b) {
    if (a === 0 || b === 0) return 0
    return this.expTable[(this.logTable[a] + this.logTable[b]) % (this.size - 1)]
  }
}

MAXICODE_FIELD_64 = new GenericGF(0b1000011, 64, 1)

class ReedSolomonEncoder {
  constructor(field) {
    this.field = field
    this.cachedGenerators = [new GenericGFPoly(field, [1])]
  }

  buildGenerator(degree) {
    if (degree >= this.cachedGenerators.length) {
      let lastGenerator = this.cachedGenerators[this.cachedGenerators.length - 1]
      for (let d = this.cachedGenerators.length; d <= degree; d += 1) {
        const nextGenerator = lastGenerator.multiply(
          new GenericGFPoly(this.field, [1, this.field.exp(d - 1 + this.field.generatorBase)]),
        )
        this.cachedGenerators.push(nextGenerator)
        lastGenerator = nextGenerator
      }
    }
    return this.cachedGenerators[degree]
  }

  encode(toEncode, ecBytes) {
    if (ecBytes === 0) throw new Error('No error correction bytes')
    const dataBytes = toEncode.length - ecBytes
    if (dataBytes <= 0) throw new Error('No data bytes provided')

    const generator = this.buildGenerator(ecBytes)
    const infoCoefficients = new Int32Array(dataBytes)
    infoCoefficients.set(toEncode.subarray(0, dataBytes))
    let info = new GenericGFPoly(this.field, Array.from(infoCoefficients))
    info = info.multiplyByMonomial(ecBytes, 1)
    const remainder = info.divide(generator)[1]
    const coefficients = remainder.coefficients
    const numZeroCoefficients = ecBytes - coefficients.length

    for (let i = 0; i < numZeroCoefficients; i += 1) {
      toEncode[dataBytes + i] = 0
    }
    for (let i = 0; i < coefficients.length; i += 1) {
      toEncode[dataBytes + numZeroCoefficients + i] = coefficients[i]
    }
  }
}

const MAXICODE_BITNR = [
  [121, 120, 127, 126, 133, 132, 139, 138, 145, 144, 151, 150, 157, 156, 163, 162, 169, 168, 175, 174, 181, 180, 187, 186, 193, 192, 199, 198, -2, -2],
  [123, 122, 129, 128, 135, 134, 141, 140, 147, 146, 153, 152, 159, 158, 165, 164, 171, 170, 177, 176, 183, 182, 189, 188, 195, 194, 201, 200, 816, -3],
  [125, 124, 131, 130, 137, 136, 143, 142, 149, 148, 155, 154, 161, 160, 167, 166, 173, 172, 179, 178, 185, 184, 191, 190, 197, 196, 203, 202, 818, 817],
  [283, 282, 277, 276, 271, 270, 265, 264, 259, 258, 253, 252, 247, 246, 241, 240, 235, 234, 229, 228, 223, 222, 217, 216, 211, 210, 205, 204, 819, -3],
  [285, 284, 279, 278, 273, 272, 267, 266, 261, 260, 255, 254, 249, 248, 243, 242, 237, 236, 231, 230, 225, 224, 219, 218, 213, 212, 207, 206, 821, 820],
  [287, 286, 281, 280, 275, 274, 269, 268, 263, 262, 257, 256, 251, 250, 245, 244, 239, 238, 233, 232, 227, 226, 221, 220, 215, 214, 209, 208, 822, -3],
  [289, 288, 295, 294, 301, 300, 307, 306, 313, 312, 319, 318, 325, 324, 331, 330, 337, 336, 343, 342, 349, 348, 355, 354, 361, 360, 367, 366, 824, 823],
  [291, 290, 297, 296, 303, 302, 309, 308, 315, 314, 321, 320, 327, 326, 333, 332, 339, 338, 345, 344, 351, 350, 357, 356, 363, 362, 369, 368, 825, -3],
  [293, 292, 299, 298, 305, 304, 311, 310, 317, 316, 323, 322, 329, 328, 335, 334, 341, 340, 347, 346, 353, 352, 359, 358, 365, 364, 371, 370, 827, 826],
  [409, 408, 403, 402, 397, 396, 391, 390, 79, 78, -2, -2, 13, 12, 37, 36, 2, -1, 44, 43, 109, 108, 385, 384, 379, 378, 373, 372, 828, -3],
  [411, 410, 405, 404, 399, 398, 393, 392, 81, 80, 40, -2, 15, 14, 39, 38, 3, -1, -1, 45, 111, 110, 387, 386, 381, 380, 375, 374, 830, 829],
  [413, 412, 407, 406, 401, 400, 395, 394, 83, 82, 41, -3, -3, -3, -3, -3, 5, 4, 47, 46, 113, 112, 389, 388, 383, 382, 377, 376, 831, -3],
  [415, 414, 421, 420, 427, 426, 103, 102, 55, 54, 16, -3, -3, -3, -3, -3, -3, -3, 20, 19, 85, 84, 433, 432, 439, 438, 445, 444, 833, 832],
  [417, 416, 423, 422, 429, 428, 105, 104, 57, 56, -3, -3, -3, -3, -3, -3, -3, -3, 22, 21, 87, 86, 435, 434, 441, 440, 447, 446, 834, -3],
  [419, 418, 425, 424, 431, 430, 107, 106, 59, 58, -3, -3, -3, -3, -3, -3, -3, -3, -3, 23, 89, 88, 437, 436, 443, 442, 449, 448, 836, 835],
  [481, 480, 475, 474, 469, 468, 48, -2, 30, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, 0, 53, 52, 463, 462, 457, 456, 451, 450, 837, -3],
  [483, 482, 477, 476, 471, 470, 49, -1, -2, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -2, -1, 465, 464, 459, 458, 453, 452, 839, 838],
  [485, 484, 479, 478, 473, 472, 51, 50, 31, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, 1, -2, 42, 467, 466, 461, 460, 455, 454, 840, -3],
  [487, 486, 493, 492, 499, 498, 97, 96, 61, 60, -3, -3, -3, -3, -3, -3, -3, -3, -3, 26, 91, 90, 505, 504, 511, 510, 517, 516, 842, 841],
  [489, 488, 495, 494, 501, 500, 99, 98, 63, 62, -3, -3, -3, -3, -3, -3, -3, -3, 28, 27, 93, 92, 507, 506, 513, 512, 519, 518, 843, -3],
  [491, 490, 497, 496, 503, 502, 101, 100, 65, 64, 17, -3, -3, -3, -3, -3, -3, -3, 18, 29, 95, 94, 509, 508, 515, 514, 521, 520, 845, 844],
  [559, 558, 553, 552, 547, 546, 541, 540, 73, 72, 32, -3, -3, -3, -3, -3, -3, 10, 67, 66, 115, 114, 535, 534, 529, 528, 523, 522, 846, -3],
  [561, 560, 555, 554, 549, 548, 543, 542, 75, 74, -2, -1, 7, 6, 35, 34, 11, -2, 69, 68, 117, 116, 537, 536, 531, 530, 525, 524, 848, 847],
  [563, 562, 557, 556, 551, 550, 545, 544, 77, 76, -2, 33, 9, 8, 25, 24, -1, -2, 71, 70, 119, 118, 539, 538, 533, 532, 527, 526, 849, -3],
  [565, 564, 571, 570, 577, 576, 583, 582, 589, 588, 595, 594, 601, 600, 607, 606, 613, 612, 619, 618, 625, 624, 631, 630, 637, 636, 643, 642, 851, 850],
  [567, 566, 573, 572, 579, 578, 585, 584, 591, 590, 597, 596, 603, 602, 609, 608, 615, 614, 621, 620, 627, 626, 633, 632, 639, 638, 645, 644, 852, -3],
  [569, 568, 575, 574, 581, 580, 587, 586, 593, 592, 599, 598, 605, 604, 611, 610, 617, 616, 623, 622, 629, 628, 635, 634, 641, 640, 647, 646, 854, 853],
  [727, 726, 721, 720, 715, 714, 709, 708, 703, 702, 697, 696, 691, 690, 685, 684, 679, 678, 673, 672, 667, 666, 661, 660, 655, 654, 649, 648, 855, -3],
  [729, 728, 723, 722, 717, 716, 711, 710, 705, 704, 699, 698, 693, 692, 687, 686, 681, 680, 675, 674, 669, 668, 663, 662, 657, 656, 651, 650, 857, 856],
  [731, 730, 725, 724, 719, 718, 713, 712, 707, 706, 701, 700, 695, 694, 689, 688, 683, 682, 677, 676, 671, 670, 665, 664, 659, 658, 653, 652, 858, -3],
  [733, 732, 739, 738, 745, 744, 751, 750, 757, 756, 763, 762, 769, 768, 775, 774, 781, 780, 787, 786, 793, 792, 799, 798, 805, 804, 811, 810, 860, 859],
  [735, 734, 741, 740, 747, 746, 753, 752, 759, 758, 765, 764, 771, 770, 777, 776, 783, 782, 789, 788, 795, 794, 801, 800, 807, 806, 813, 812, 861, -3],
  [737, 736, 743, 742, 749, 748, 755, 754, 761, 760, 767, 766, 773, 772, 779, 778, 785, 784, 791, 790, 797, 796, 803, 802, 809, 808, 815, 814, 863, 862],
]

const MAXICODE_BULLSEYE_RADIUS_FACTOR = 5.25
const MAXICODE_BULLSEYE_RADIUS_TO_HEX_RADIUS_FACTOR = MAXICODE_BULLSEYE_RADIUS_FACTOR / 0.64
const MAXICODE_BULLSEYE_SHIFT_FACTOR = 0.74
const MAXICODE_BULLSEYE_CLEAR_FACTOR = 1.0
const MAXICODE_HEX_RADIUS_FACTOR = 0.8

function buildMaxiCodeLayout(size, margin, width, height) {
  const scale = (size - margin * 2) / 50
  const hexRadius = scale * MAXICODE_HEX_RADIUS_FACTOR
  const pitchX = hexRadius * Math.sqrt(3)
  const pitchY = hexRadius * 1.5
  const hexWidth = pitchX
  const hexHeight = hexRadius * 2
  const totalWidth = (width - 1) * pitchX + hexWidth + pitchX / 2
  const totalHeight = (height - 1) * pitchY + hexHeight
  const offsetX = (size - totalWidth) / 2
  const offsetY = (size - totalHeight) / 2
  const centerX = offsetX + totalWidth / 2
  const centerY = offsetY + totalHeight / 2

  return {
    scale,
    hexRadius,
    pitchX,
    pitchY,
    hexWidth,
    hexHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
    centerX,
    centerY,
    bullseyeCenterX: centerX - pitchX * MAXICODE_BULLSEYE_SHIFT_FACTOR,
    bullseyeCenterY: centerY,
    bullseyeOuterRadius: hexRadius * MAXICODE_BULLSEYE_RADIUS_TO_HEX_RADIUS_FACTOR,
    bullseyeClearRadius: hexRadius * (MAXICODE_BULLSEYE_RADIUS_TO_HEX_RADIUS_FACTOR + MAXICODE_BULLSEYE_CLEAR_FACTOR),
  }
}

const MAXICODE_GO_GRID = MAXICODE_BITNR.map((row) =>
  row.map((value) => (value < 0 ? 0 : value + 1)),
)

const MAXICODE_FIXED_TEMPLATE = buildMaxiCodeFixedTemplate()

function buildMaxiCodeFixedTemplate() {
  const black = []
  const white = []
  const illegal = []

  for (let y = 0; y < MAXICODE_BITNR.length; y += 1) {
    for (let x = 0; x < MAXICODE_BITNR[y].length; x += 1) {
      const value = MAXICODE_BITNR[y][x]
      if (value === -2) {
        black.push([y, x])
      } else if (value === -1) {
        white.push([y, x])
      } else if (value === -3) {
        illegal.push([y, x])
      }
    }
  }

  return { black, white, illegal }
}

export {
  MAXICODE_HEIGHT,
  MAXICODE_WIDTH,
  MAXICODE_BITNR,
  MAXICODE_BULLSEYE_RADIUS_FACTOR,
  MAXICODE_BULLSEYE_RADIUS_TO_HEX_RADIUS_FACTOR,
  MAXICODE_BULLSEYE_SHIFT_FACTOR,
  MAXICODE_BULLSEYE_CLEAR_FACTOR,
  MAXICODE_HEX_RADIUS_FACTOR,
  MAXICODE_GO_GRID,
  MAXICODE_FIXED_TEMPLATE,
  buildMaxiCodeLayout,
  MAXICODE_CHARSETS,
}
