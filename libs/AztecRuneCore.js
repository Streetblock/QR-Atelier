import { buildAztecRuneMatrix } from './AztecCore.js'

export class AztecRuneCore {
  constructor(value) {
    this.value = normalizeRuneValue(value)
  }

  generate() {
    const rune = buildAztecRuneMatrix(this.value)
    return {
      format: 'aztec-rune',
      data: String(this.value),
      value: this.value,
      readyForScan: true,
      compact: true,
      layers: 0,
      codewordSize: 4,
      ...rune,
    }
  }
}

function normalizeRuneValue(value) {
  if (typeof value === 'string') {
    if (!/^\d{1,3}$/.test(value)) {
      throw new Error('Aztec Rune requires one to three decimal digits.')
    }
    value = Number(value)
  }
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error('Aztec Rune value must be an integer from 0 to 255.')
  }
  return value
}
