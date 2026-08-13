import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLegacyUnprotectedBits,
  calculateLegacyCrcField,
  calculateLegacyCrcRegister,
  encodeLegacyBase41,
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

test.todo('generates the complete 13x13 ECC 050 reference matrix')
