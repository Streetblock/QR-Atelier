// Reed-Solomon error correction over the PDF417 prime field (modulo 929).

const MODULUS = 929
const GENERATOR = 3
const coefficientCache = new Map()

export function generatePdf417ErrorCorrection(dataCodewords, errorCodewordCount) {
  const data = normalizeCodewords(dataCodewords, 'data')
  const count = Number(errorCodewordCount)
  if (!Number.isInteger(count) || count < 1 || count > 512) {
    throw new Error('PDF417 errorCodewordCount must be an integer between 1 and 512.')
  }

  const coefficients = getGeneratorCoefficients(count)
  const error = new Array(count).fill(0)

  for (const codeword of data) {
    const step = (codeword - error[0] + MODULUS) % MODULUS
    for (let index = 0; index < count - 1; index += 1) {
      error[index] = (error[index + 1] + coefficients[count - index - 1] * step) % MODULUS
    }
    error[count - 1] = (coefficients[0] * step) % MODULUS
  }

  return error
}

export function getPdf417GeneratorCoefficients(errorCodewordCount) {
  return [...getGeneratorCoefficients(errorCodewordCount)]
}

function getGeneratorCoefficients(errorCodewordCount) {
  const count = Number(errorCodewordCount)
  if (!Number.isInteger(count) || count < 1 || count > 512) {
    throw new Error('PDF417 errorCodewordCount must be an integer between 1 and 512.')
  }
  const cached = coefficientCache.get(count)
  if (cached) return cached

  const coefficients = new Array(count + 1).fill(0)
  coefficients[0] = 1
  let alpha = 1

  for (let degree = 1; degree <= count; degree += 1) {
    alpha = (alpha * GENERATOR) % MODULUS
    coefficients[degree] = coefficients[degree - 1]
    for (let index = degree - 1; index >= 1; index -= 1) {
      coefficients[index] = (coefficients[index] * alpha + coefficients[index - 1]) % MODULUS
    }
    coefficients[0] = (coefficients[0] * alpha) % MODULUS
  }

  coefficients.pop()
  for (let index = coefficients.length - 1; index >= 0; index -= 2) {
    coefficients[index] = (MODULUS - coefficients[index]) % MODULUS
  }

  const frozen = Object.freeze(coefficients)
  coefficientCache.set(count, frozen)
  return frozen
}

function normalizeCodewords(codewords, label) {
  if (!Array.isArray(codewords) && !(codewords instanceof Uint16Array)) {
    throw new TypeError(`PDF417 ${label} codewords must be an array.`)
  }
  const normalized = Array.from(codewords)
  if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value > 928)) {
    throw new Error(`PDF417 ${label} codewords must be integers from 0 to 928.`)
  }
  return normalized
}
