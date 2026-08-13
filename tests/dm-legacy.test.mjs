import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addLegacyFinderPattern,
  buildLegacyUnprotectedBits,
  buildLegacyEcc050UnrandomizedBits,
  calculateLegacyCrcField,
  calculateLegacyCrcRegister,
  encodeLegacyEcc050,
  encodeLegacyBase41,
  generateLegacyEcc050Reference,
  placeLegacy11x11,
  randomizeLegacyBits,
} from '../libs/DMlegacy.js'

const REFERENCE_PAYLOAD = 'AB12-X'

test('encodes the ECC 050 reference payload with legacy base 41', () => {
  assert.equal(
    encodeLegacyBase41(REFERENCE_PAYLOAD),
    '0010010111101100111110' + '11111111110',
  )
})

test('calculates the legacy CRC register and transmitted field', () => {
  assert.equal(calculateLegacyCrcRegister(3, REFERENCE_PAYLOAD), 0x7559)
  assert.equal(calculateLegacyCrcField(3, REFERENCE_PAYLOAD), '1001101010101110')
})

test('builds the complete unprotected bit stream for the ECC 050 reference', () => {
  assert.equal(
    buildLegacyUnprotectedBits(REFERENCE_PAYLOAD),
    '00010' +
      '1001101010101110' +
      '011000000' +
      '0010010111101100111110' +
      '11111111110',
  )
})

test('rejects characters outside the base-41 repertoire', () => {
  assert.throws(() => encodeLegacyBase41('lowercase'), /not available/)
})

const REFERENCE_PROTECTED =
  '00001010101111111010101010100000' +
  '01000011011010000101000110000000' +
  '11101010100110101001100001001010'

const REFERENCE_RANDOMIZED =
  '01110101111110001100011001100110' +
  '01111101111111001000101111110001' +
  '01101110101101111000001000110111' +
  '1110000011101001000011011'

const REFERENCE_DATA_ROWS = [
  '11010011001',
  '10010101101',
  '10111001010',
  '11011101010',
  '01100001100',
  '11101001101',
  '00100111110',
  '10101111001',
  '01111101010',
  '10010011110',
  '00110110111',
]

const REFERENCE_SYMBOL_ROWS = [
  '1010101010101',
  '1110100110010',
  '1100101011011',
  '1101110010100',
  '1110111010101',
  '1011000011000',
  '1111010011011',
  '1001001111100',
  '1101011110011',
  '1011111010100',
  '1100100111101',
  '1001101101110',
  '1111111111111',
]

function rowsToStrings(modules) {
  return modules.map((row) => row.map((module) => Number(module)).join(''))
}

test('encodes all 24 cycles of the ECC 050 convolution reference', () => {
  const unprotected = buildLegacyUnprotectedBits(REFERENCE_PAYLOAD)
  assert.equal(encodeLegacyEcc050(unprotected), REFERENCE_PROTECTED)
})

test('builds and randomizes the 121-bit ECC 050 reference stream', () => {
  const unprotected = buildLegacyUnprotectedBits(REFERENCE_PAYLOAD)
  const unrandomized = buildLegacyEcc050UnrandomizedBits(unprotected)
  assert.equal(unrandomized, '0111000000000111000' + REFERENCE_PROTECTED + '000000')
  assert.equal(randomizeLegacyBits(unrandomized), REFERENCE_RANDOMIZED)
})

test('places every randomized reference bit in the 11x11 data grid', () => {
  const modules = placeLegacy11x11(REFERENCE_RANDOMIZED)
  assert.deepEqual(rowsToStrings(modules), REFERENCE_DATA_ROWS)
})

test('uses every 11x11 placement position exactly once', () => {
  for (let position = 0; position < 121; position += 1) {
    const oneHotBits = `${'0'.repeat(position)}1${'0'.repeat(120 - position)}`
    const modules = placeLegacy11x11(oneHotBits)
    assert.equal(modules.flat().filter(Boolean).length, 1, `randomized bit ${position}`)
  }
})

test('adds the legacy finder pattern', () => {
  const dataModules = REFERENCE_DATA_ROWS.map((row) => Array.from(row, (bit) => bit === '1'))
  assert.deepEqual(rowsToStrings(addLegacyFinderPattern(dataModules)), REFERENCE_SYMBOL_ROWS)
})

test('generates the complete 13x13 ECC 050 reference matrix', () => {
  const result = generateLegacyEcc050Reference(REFERENCE_PAYLOAD)
  assert.equal(result.rows, 13)
  assert.equal(result.cols, 13)
  assert.deepEqual(rowsToStrings(result.modules), REFERENCE_SYMBOL_ROWS)
})
