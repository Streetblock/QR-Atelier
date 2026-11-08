import test from 'node:test'
import assert from 'node:assert/strict'
import { DotCodeCore } from '../libs/DotCodeCore.js'

// Grid centers from cab's JScript Programming Manual, p. 108,
// cross-checked with BWIPP. White centers are active in the inverted example.
const cabMatrices = {
  Dotcode: [
    '100010000010001010101',
    '010000010101010000010',
    '101010001000000010000',
    '010101000100000100010',
    '001010101010000000100',
    '010001010001010001010',
    '101010101000001010001',
    '010001000000000000000',
    '000010101010100000000',
    '000001010001000001010',
    '000000000010101010001',
    '000100000101010101010',
    '001000101000101010001',
    '010000010001010101000',
  ],
  Test: [
    '10100010001000001',
    '00010001010100010',
    '10001000000010101',
    '00000101010001010',
    '00101000001010101',
    '01010000000001000',
    '10101000101010101',
    '01000100010000000',
    '00000010000010001',
    '01000101010001010',
    '10100010001010001',
    '01010101000100010',
  ],
  dots: [
    '10100010101000101',
    '00010101010000010',
    '10000010000000001',
    '00000101000101000',
    '00101010101010101',
    '01010100000101010',
    '10000010101010001',
    '01010000000000000',
    '00001000101010001',
    '01010000010000010',
    '10001010000010101',
    '01000001000101010',
  ],
}

for (const [value, expected] of Object.entries(cabMatrices)) {
  test(`matches the cab and BWIPP DotCode matrices for "${value}"`, () => {
    const symbol = new DotCodeCore(value).generate()
    assert.equal(symbol.width, expected[0].length)
    assert.equal(symbol.height, expected.length)
    assert.deepEqual(symbol.modules.map(row => row.map(Number).join('')), expected)
  })
}
