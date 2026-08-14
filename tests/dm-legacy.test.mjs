import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  addLegacyFinderPattern,
  buildLegacyUnprotectedBits,
  buildLegacyEcc050UnrandomizedBits,
  buildLegacyUnrandomizedBits,
  calculateLegacyCrcField,
  calculateLegacyCrcRegister,
  encodeLegacyEcc050,
  encodeLegacyEcc000,
  encodeLegacyEcc080,
  encodeLegacyEcc100,
  encodeLegacyEcc140,
  encodeLegacyBase41,
  encodeLegacyData,
  selectLegacyFormat,
  generateLegacyEcc050Reference,
  generateLegacyDataMatrix,
  getLegacyPlacement,
  LEGACY_PLACEMENT_DATA_SIDES,
  placeLegacyBits,
  LEGACY_MASTER_RANDOM_BITS,
  placeLegacy11x11,
  selectLegacyDataSide,
  randomizeLegacyBits,
} from '../libs/DMlegacy.js'

const REFERENCE_PAYLOAD = 'AB12-X'

test('encodes the ECC 050 reference payload with legacy base 41', () => {
  assert.equal(
    encodeLegacyBase41(REFERENCE_PAYLOAD),
    '0010010111101100111110' + '11111111110',
  )
})
const PARTIAL_GROUP_FIXTURES = [
  [1, '123456', [
    '0100',
    '1100010',
    '11100000010',
    '01100000001110',
    '001101001100111010',
    '100101110110010101001',
  ]],
  [2, 'ABCDE', [
    '10000',
    '1110110000',
    '010000110001000',
    '01110010001111001000',
    '110000000001001110010100',
  ]],
  [4, 'ABC1', [
    '100000',
    '11010010000',
    '0110101000001000',
    '010000010010110110101',
  ]],
  [3, 'ABC.', [
    '100000',
    '11001010000',
    '01100000001010000',
    '1100001010111111011001',
  ]],
]

test('encodes every partial group length for legacy base formats', () => {
  for (const [format, sample, expectedPrefixes] of PARTIAL_GROUP_FIXTURES) {
    expectedPrefixes.forEach((expected, index) => {
      assert.equal(encodeLegacyData(sample.slice(0, index + 1), { format }).encodedBits, expected)
    })
  }
})

test('emits ASCII and byte values least-significant bit first', () => {
  assert.deepEqual(encodeLegacyData('B', { format: 5 }), {
    formatId: 5,
    encodedBits: '0100001',
  })
  assert.deepEqual(encodeLegacyData(Uint8Array.of(0x96), { format: 6 }), {
    formatId: 6,
    encodedBits: '01101001',
  })
})

test('selects the first complete legacy repertoire in the normative order', () => {
  assert.equal(selectLegacyFormat('123'), 1)
  assert.equal(selectLegacyFormat('ABC'), 2)
  assert.equal(selectLegacyFormat('ABC1'), 4)
  assert.equal(selectLegacyFormat('ABC-'), 3)
  assert.equal(selectLegacyFormat('lowercase'), 5)
  assert.equal(selectLegacyFormat('é'), 6)
  assert.equal(selectLegacyFormat(Uint8Array.of(0xff)), 6)
})

test('validates explicit legacy format repertoires', () => {
  assert.throws(() => encodeLegacyData('A', { format: 1 }), /legacy base 11/)
  assert.throws(() => encodeLegacyData('é', { format: 5 }), /exceeds/)
  assert.throws(() => encodeLegacyData('😀'), /above 8-bit/)
  assert.throws(() => encodeLegacyData('ABC', { format: 7 }), /integer from 1 through 6/)
})


test('writes the selected legacy format ID into the five-bit data prefix', () => {
  assert.equal(buildLegacyUnprotectedBits('123').slice(0, 5), '00000')
  assert.equal(buildLegacyUnprotectedBits('ABC1', { format: 4 }).slice(0, 5), '00011')
  assert.equal(buildLegacyUnprotectedBits(Uint8Array.of(0x96)).slice(0, 5), '00101')
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

test('keeps ECC 000 unprotected bits unchanged', () => {
  const unprotectedBits = '00101011001101110010010000000001101001'
  assert.equal(encodeLegacyEcc000(unprotectedBits), unprotectedBits)
})

test('selects the smallest reviewed data side and validates forced sizes', () => {
  assert.equal(selectLegacyDataSide(49, { ecc: 0 }), 7)
  assert.equal(selectLegacyDataSide(50, { ecc: 0 }), 9)
  assert.equal(selectLegacyDataSide(81, { ecc: 50 }), 9)
  assert.equal(selectLegacyDataSide(82, { ecc: 50 }), 11)
  assert.equal(selectLegacyDataSide(121, { ecc: 80 }), 11)
  assert.equal(selectLegacyDataSide(49, { ecc: 0, symbolSize: 9 }), 7)
  assert.throws(() => selectLegacyDataSide(50, { ecc: 0, symbolSize: 9 }), /provides 49/)
  assert.throws(() => selectLegacyDataSide(49, { ecc: 50, symbolSize: 9 }), /does not support/)
  assert.throws(() => selectLegacyDataSide(1, { ecc: 80, symbolSize: 11 }), /does not support/)
  assert.equal(selectLegacyDataSide(1, { ecc: 0, symbolSize: 33 }), 31)
  assert.throws(() => selectLegacyDataSide(1, { ecc: 200 }), /must be 0, 50, 80, 100, or 140/)
})

test('checks every reviewed automatic-size boundary', () => {
  for (const ecc of [0, 50, 80, 100, 140]) {
    const minimumDataSide = { 0: 7, 50: 9, 80: 11, 100: 11, 140: 15 }[ecc]
    const dataSides = LEGACY_PLACEMENT_DATA_SIDES.filter((side) => side >= minimumDataSide)

    dataSides.forEach((dataSide, index) => {
      assert.equal(selectLegacyDataSide(dataSide * dataSide, { ecc }), dataSide)
      if (index + 1 < dataSides.length) {
        assert.equal(selectLegacyDataSide(dataSide * dataSide + 1, { ecc }), dataSides[index + 1])
      } else {
        assert.throws(
          () => selectLegacyDataSide(dataSide * dataSide + 1, { ecc }),
          /exceeds the maximum 2209-module placement/,
        )
      }
    })
  }
})

test('builds the complete ECC 000 bit stages for one raw byte', () => {
  const unprotectedBits = buildLegacyUnprotectedBits(Uint8Array.of(0x96))
  assert.equal(unprotectedBits, '00101011001101110010010000000001101001')

  const stage = buildLegacyUnrandomizedBits(unprotectedBits)
  assert.equal(stage.dataSide, 7)
  assert.equal(stage.protectedBits, unprotectedBits)
  assert.equal(
    stage.unrandomizedBits,
    '0111111001010110011011100100100000000011010010000',
  )
})

test('generates the reviewed 9x9 ECC 000 structural fixture', () => {
  const result = generateLegacyDataMatrix(Uint8Array.of(0x96))
  assert.deepEqual(
    {
      rows: result.rows,
      cols: result.cols,
      ecc: result.ecc,
      formatId: result.formatId,
      dataSide: result.dataSide,
    },
    { rows: 9, cols: 9, ecc: 0, formatId: 6, dataSide: 7 },
  )
  assert.deepEqual(rowsToStrings(result.modules), [
    '101010101',
    '110110010',
    '111100001',
    '101010110',
    '101101111',
    '100010010',
    '111111001',
    '101011010',
    '111111111',
  ])
})

test('encodes all 24 cycles of the ECC 050 convolution reference', () => {
  const unprotected = buildLegacyUnprotectedBits(REFERENCE_PAYLOAD)
  assert.equal(encodeLegacyEcc050(unprotected), REFERENCE_PROTECTED)
})

test('encodes ECC 080 through all input and eleven flush cycles', () => {
  assert.equal(
    encodeLegacyEcc080('10'),
    '101110000100010111101101010010110000',
  )
  assert.equal(encodeLegacyEcc080('').length, 33)
  assert.equal(encodeLegacyEcc080('1').length, 36)
  assert.throws(() => encodeLegacyEcc080('10x'), /binary string/)
})

test('matches an independent 300 dpi ECC 080 symbol module for module', () => {
  const result = generateLegacyDataMatrix('A', { ecc: 80, format: 6, symbolSize: 13 })
  assert.equal(result.formatId, 6)
  assert.equal(result.dataSide, 11)
  assert.deepEqual(rowsToStrings(result.modules), [
    '1010101010101', '1100110101010', '1101110111001', '1001101111010',
    '1010000011101', '1110100000100', '1001000001011', '1101111010000',
    '1000010101011', '1100111101010', '1010011100101', '1010001010010',
    '1111111111111',
  ])
})

test('generates stable 13x13 ECC 080 symbols for automatic legacy formats', () => {
  const expected = {
    A: [
      '1010101010101', '1100011000010', '1111110111101', '1000101011000',
      '1010011011101', '1011110101110', '1100000011011', '1000100100110',
      '1000011101111', '1100110111110', '1010111110111', '1001101011110',
      '1111111111111',
    ],
    ABC: [
      '1010101010101', '1101111001010', '1101000110011', '1011000011010',
      '1000000011101', '1010010101010', '1100010111011', '1011100100000',
      '1100100101111', '1111101111010', '1100010110111', '1010100001010',
      '1111111111111',
    ],
  }

  for (const [payload, rows] of Object.entries(expected)) {
    const result = generateLegacyDataMatrix(payload, { ecc: 80 })
    assert.equal(result.dataSide, 11)
    assert.equal(result.protectedBits.length, (Math.ceil(result.unprotectedBits.length / 2) + 11) * 3)
    assert.deepEqual(rowsToStrings(result.modules), rows)
  }
})

test('encodes ECC 100 through all input and fifteen flush cycles', () => {
  assert.equal(encodeLegacyEcc100('1'), '11011001011011101010100100010111')
  assert.equal(encodeLegacyEcc100('').length, 30)
  assert.throws(() => encodeLegacyEcc100('10x'), /binary string/)
})

test('generates independently cross-checked 13x13 ECC 100 symbols', () => {
  const expected = {
    A: [
      '1010101010101', '1110001111010', '1101001011011', '1001000111010',
      '1100011010111', '1110100001100', '1110000001011', '1001001011110',
      '1001101110011', '1010010101000', '1100001110111', '1000111000010',
      '1111111111111',
    ],
    C: [
      '1010101010101', '1110101000010', '1111001010111', '1001100111100',
      '1010010110111', '1111000100000', '1100000001011', '1010010111010',
      '1000100101111', '1000001001100', '1100101100101', '1010100011010',
      '1111111111111',
    ],
  }

  for (const [payload, rows] of Object.entries(expected)) {
    const result = generateLegacyDataMatrix(payload, { ecc: 100 })
    assert.equal(result.dataSide, 11)
    assert.equal(result.protectedBits.length, (result.unprotectedBits.length + 15) * 2)
    assert.deepEqual(rowsToStrings(result.modules), rows)
  }
})

test('encodes ECC 140 through all input and thirteen flush cycles', () => {
  assert.equal(
    encodeLegacyEcc140('1'),
    '11110011001101001111001100001111010001111101011110111111',
  )
  assert.equal(encodeLegacyEcc140('').length, 52)
  assert.throws(() => encodeLegacyEcc140('10x'), /binary string/)
})

test('generates independently cross-checked 17x17 ECC 140 symbols', () => {
  const expected = {
    A: [
      '10101010101010101', '11010011111001010', '10100101110111111',
      '10110101011100000', '10111010010001001', '11101011111101010',
      '11110001100001011', '11100110110010010', '10011010001100001',
      '11001010001000010', '11010011110101101', '10000110011101110',
      '11110101111100011', '11010000000100110', '10001101001101101',
      '10110010101000010', '11111111111111111',
    ],
    C: [
      '10101010101010101', '11010111001011010', '10010100111110001',
      '11111011011101010', '10111110011111001', '10111111111101010',
      '10000000111001111', '11010010010111100', '11100000011110001',
      '10011011101110010', '10010011011101001', '10011010010111100',
      '11011111001111011', '11111000101000010', '11001011001101111',
      '10101000101111110', '11111111111111111',
    ],
  }

  for (const [payload, rows] of Object.entries(expected)) {
    const result = generateLegacyDataMatrix(payload, { ecc: 140 })
    assert.equal(result.dataSide, 15)
    assert.equal(result.protectedBits.length, (result.unprotectedBits.length + 13) * 4)
    assert.deepEqual(rowsToStrings(result.modules), rows)
  }
})

test('builds and randomizes the 121-bit ECC 050 reference stream', () => {
  const unprotected = buildLegacyUnprotectedBits(REFERENCE_PAYLOAD)
  const unrandomized = buildLegacyEcc050UnrandomizedBits(unprotected)
  assert.equal(unrandomized, '0111000000000111000' + REFERENCE_PROTECTED + '000000')
  assert.equal(randomizeLegacyBits(unrandomized), REFERENCE_RANDOMIZED)
})

test('preserves the complete 2209-bit legacy master random stream', () => {
  assert.equal(LEGACY_MASTER_RANDOM_BITS.length, 47 * 47)
  assert.equal(LEGACY_MASTER_RANDOM_BITS.slice(0, 32), '00000101111111111100011100110001')
  assert.equal(LEGACY_MASTER_RANDOM_BITS.slice(-33), '111101000101000001111001000010000')
  assert.equal(
    createHash('sha256').update(LEGACY_MASTER_RANDOM_BITS, 'ascii').digest('hex'),
    '01321a358a45be5ed377766b44071db243e82f0d0c21e6b78578b357bfe18e49',
  )
  assert.equal(randomizeLegacyBits('0'.repeat(47 * 47)), LEGACY_MASTER_RANDOM_BITS)
  assert.throws(() => randomizeLegacyBits('0'.repeat(47 * 47 + 1)), /at most 2209 bits/)
})

const PLACEMENT_DIGESTS = {
  7: '8bb16c731fce61fde20b3b46e005d6a7dcc2656937380adb38cbe31f1d663942',
  9: '3de84ced51d0f326475add895184f57398ba67c10a30e67923071caa3d7d132f',
  11: '4b75790ea3330dc6375fb97c777dce8a618818948ea1b9995239dd19e072f435',
  13: '7060d0bea8653172cc510c41dce6ee72d0d8a7a58231438790a3db295526eafe',
  15: '6adae2f52e7ad84d1b9bec2b2e78f7a97d27c8e47d26207b77a0719c82411909',
  17: '84a4433ed5bc1d681bdec4586fef41f2d92f7c4de1ca30cdeaccfccba360e165',
  19: '717a1f2c8f4d63ca06d6880f7f8b721d8c7beeafa4820d9838532288edbcd90a',
  21: 'f9248731e3f3e99485acabc1edf60a8d23fdaf9d573d31e568daf146bb2c812b',
  23: '7cfab1bfa5cd1964cdde4fa4e2a3b09645121d94ed941db43cb492e6e743a873',
  25: '1495d688a00bfc92f7683f59dc8d70525caf221aaab145f4b7ad05c5b4240df7',
  27: 'd05d342e8cdb2c2610ff281d07cac051e75e2c9cb0b1555ac7378f4f4d12c33f',
  29: '3cbe0412e66ae1ea1d95c3e2a890676cf0b1dfd38043dedab18d6aa9ad96d77d',
  31: 'b7fe7e7026bf59725e63e894553385b1cf8d0327107efe908b1670a42b42ce01',
  33: 'c9fdee30c76037956ee5dcb798d8585cb6e11801dfaa638d981003a0b1719c2c',
  35: '5628fac0d902d902cd08a6c0619113fb0896209d368ff674ae009c2c220f92a8',
  37: '7a88f168d9019c6d70f8a5d325305987bfcafd9378239e2737267d3a61029015',
  39: '7376079de27d1f27cdf340e5bab18ed6643f2026dc5baa6c4badf720afd35192',
  41: 'c53a0e6b17f8ea3a70a50ae221d642bd5d08b2f3f8c151506674e4d0cb6f2d95',
  43: 'f2328d5e24c57191aa6ed40f4e3cf93f7a3d5e924a19e71fd47115737cb30651',
  45: '361f2d52f29375bd895e84ae8384a9f692199328fca12a92be2cc10fd7a18a95',
  47: '460878e787e0832137195b6a61a6b0980916a1ea9b866321a945452cb77f7204',
}

test('preserves every reviewed H.1-H.21 placement as a complete permutation', () => {
  assert.deepEqual(
    LEGACY_PLACEMENT_DATA_SIDES,
    [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
  )

  for (const dataSide of LEGACY_PLACEMENT_DATA_SIDES) {
    const placement = getLegacyPlacement(dataSide)
    const expectedPositions = Array.from({ length: dataSide * dataSide }, (_, index) => index)
    assert.deepEqual([...placement].sort((left, right) => left - right), expectedPositions)

    const bytes = new Uint8Array(placement.length * 2)
    placement.forEach((value, index) => {
      bytes[index * 2] = value & 0xff
      bytes[index * 2 + 1] = value >>> 8
    })
    assert.equal(createHash('sha256').update(bytes).digest('hex'), PLACEMENT_DIGESTS[dataSide])
  }
})

test('repairs the duplicated H.4 source position without moving its valid 52', () => {
  const placement = getLegacyPlacement(13)
  assert.equal(placement[9 * 13 + 8], 62)
  assert.equal(placement[12 * 13 + 2], 52)
})

test('places reviewed data sizes and rejects unsupported or malformed grids', () => {
  assert.equal(placeLegacyBits('1' + '0'.repeat(48), 7).flat().filter(Boolean).length, 1)
  assert.equal(placeLegacyBits('1' + '0'.repeat(47 * 47 - 1), 47).flat().filter(Boolean).length, 1)
  assert.throws(() => placeLegacyBits('0'.repeat(49 * 49), 49), /currently supports/)
  assert.throws(() => placeLegacyBits('0'.repeat(48), 7), /requires exactly 49 bits/)
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
