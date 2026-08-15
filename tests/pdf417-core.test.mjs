import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { BinaryBitmap, BitMatrix } from '@zxing/library'
import pdf417ReaderModule from '@zxing/library/cjs/core/pdf417/PDF417Reader.js'

import {
  MICRO_PDF417_VARIANTS,
  MicroPdf417Core,
  Pdf417Core,
  getPdf417CodewordPattern,
} from '../libs/PDF417core.js'
import {
  compactPdf417,
  encodePdf417Bytes,
  encodePdf417Numeric,
  encodePdf417Text,
} from '../libs/PDF417Compaction.js'
import {
  generatePdf417ErrorCorrection,
  getPdf417GeneratorCoefficients,
} from '../libs/PDF417ErrorCorrection.js'

const PDF417Reader = pdf417ReaderModule.default

const MICRO_REFERENCE_FINGERPRINTS = {
  '1x11': '1645f8bf399df61f62c5e4e07417eff69ebf292bcc69d350c6c4a09d18d9cac4',
  '1x14': '7d154c3449a33136624b4e6f4e12672771ae6183d0afdbe554479e3bf52bc029',
  '1x17': '0d89874bcabbe16d8574ee0536f431e5809f3592f55b5f673b90de1eec068fc9',
  '1x20': '50d8f29550fbef83594a96d7f724fe6e570939efb32fc466f2353ceacd1320a1',
  '1x24': '507cc725f212ba9dc8595813e8cd60eb9e2aeba82de3ec4c2ce6264e45689fc7',
  '1x28': 'bc90333757b073a6c3c74e42fc9fdc264d933e888cd6d27db0a08ff655b9a9df',
  '2x8': '3fd2d520eebf84376922d1ed68185f53d93ea870e0316b5ad8dfa6c4d89dc4bf',
  '2x11': '41c42c0ab965ebfac90040849031cfcc2efefe62f1f5327d4d66e9ce3b7bf7d2',
  '2x14': '9903dc984a811226c75093c978837a4167d63f38209979c0f3ab55a4119dad3c',
  '2x17': '385d8be281953e363079a6d14485d6c59acfe34bfdc394d1e9b8c8be0fe597b7',
  '2x20': '8b6318374430aeae7054f5451ebdb47ff649f3db5519fd6d3a7fddb8afbb3f4a',
  '2x23': '1e4246c7c2c47f3e843886f4ecac64c7b7f8f2903dfd498666420dc9939c76c4',
  '2x26': '7bbe15b6d98c9aaebda80ddd72cd4af6340df281d49e001e01450474efd06bc8',
  '3x6': 'b561a18c1c0acbbd537721141f525b289612f1c9a7c4c79a188f5335aa4d2677',
  '3x8': '6230484797e6ab9cf706777f77d10f878d3f19d6dd70ed98ac1b110a5de6bb6f',
  '3x10': '77ba74a98d448feb350b276bc61688faf26563eba0c1c20e32c5a2587bb47d9c',
  '3x12': '12b57ea46cdf7e80495af518f93541cac42c0a4a3cb8b2865e9b3fff267714cd',
  '3x15': 'b0fa9ae8708f9a2123a9d5ca5c6e52998fc7f665c3ba540c9f52b5ec89383ce5',
  '3x20': '3c55a87c206a301a90b6100135990bc0307b2142161100ada3780506b1dbc222',
  '3x26': 'e2562adee715e56dc37eb37b3cff8219da4832b01543a28349c14262a6f276da',
  '3x32': '4161890a8deb78ebc1942c154576c29a0371d9692375ef19b4415b89c2f758e8',
  '3x38': '2eb98107422def2cdd3c2cc8b9860f17cf950195853881ee5dd1d32c8b2641d8',
  '3x44': '6c6fccd52818f7bb65c2f138ef63df08dacb8f38f96ca6c530cfb6dc0cc2754c',
  '4x4': '6daa2d77a8328a1471e6e870d1003ec3826ed16a908d5849b14900def5e53129',
  '4x6': '5ad3a1e091bf36ecb207581fc3bb257c798757878799ed8882d21ff6260a4fe1',
  '4x8': 'bbc7b56a13a9059a93fc144e272fcea83cc0e63218bfb47b4a93c367b7a7583f',
  '4x10': '7420b7b1a1a9a47deee36ea28175c71cfc9e94e67d8cf3174c39ea6fba5ed7f5',
  '4x12': '78d91edbcbcf75d0de4ef44bfaa0b970ccb6e2b720399b24a1bdd0b6dc884d0a',
  '4x15': 'c6467db28ac59f1c45af7a3f7c5f1cf2656da153094f67921e90e76f439eb98c',
  '4x20': '28bfce8b503ae06346b6e094c21baac4c80caca29cecc15ecb65e8760b3c004e',
  '4x26': '117fab5960060bd6ecdb053e233ae471e2ab8071a2be4c4c6d3d9fca5f0c8e30',
  '4x32': '713b326f7e0134aaee7f053f6611c5f1608976c51440beb1cd9d1157c9fce097',
  '4x38': '548e432f53671a5573ecaf63c79d2b74a2f79159d852002ce19b87aed5058572',
  '4x44': '9f15298376d720d387f1f38f46bddd8f64ff06b6732c59381309712ac2edb60b',
}

function matrixFingerprint(modules) {
  const bits = modules.map((row) => row.map(Number).join('')).join('')
  return createHash('sha256').update(bits).digest('hex')
}

function assertBooleanMatrix(result) {
  assert.equal(result.modules.length, result.rows)
  for (const row of result.modules) {
    assert.equal(row.length, result.columns)
    assert.ok(row.every((module) => typeof module === 'boolean'))
  }
}

function toPdf417Bitmap(modules) {
  const quietZone = 8
  const moduleWidth = 3
  const rowHeight = 9
  const width = (modules[0].length + quietZone * 2) * moduleWidth
  const height = (modules.length + quietZone * 2) * rowHeight
  const matrix = new BitMatrix(width, height)

  for (let row = 0; row < modules.length; row += 1) {
    for (let column = 0; column < modules[row].length; column += 1) {
      if (!modules[row][column]) continue
      matrix.setRegion(
        (column + quietZone) * moduleWidth,
        (row + quietZone) * rowHeight,
        moduleWidth,
        rowHeight,
      )
    }
  }

  return new BinaryBitmap({
    getWidth: () => width,
    getHeight: () => height,
    getBlackMatrix: () => matrix,
  })
}

test('publishes all 34 standardized MicroPDF417 variants', () => {
  assert.equal(MICRO_PDF417_VARIANTS.length, 34)
  assert.deepEqual(
    MICRO_PDF417_VARIANTS.filter((variant) => variant.dataColumns === 1).map((variant) => variant.rows),
    [11, 14, 17, 20, 24, 28],
  )
  assert.deepEqual(
    MICRO_PDF417_VARIANTS.filter((variant) => variant.dataColumns === 2).map((variant) => variant.rows),
    [8, 11, 14, 17, 20, 23, 26],
  )
  assert.deepEqual(
    MICRO_PDF417_VARIANTS.filter((variant) => variant.dataColumns === 3).map((variant) => variant.rows),
    [6, 8, 10, 12, 15, 20, 26, 32, 38, 44],
  )
  assert.deepEqual(
    MICRO_PDF417_VARIANTS.filter((variant) => variant.dataColumns === 4).map((variant) => variant.rows),
    [4, 6, 8, 10, 12, 15, 20, 26, 32, 38, 44],
  )
})

test('generates every MicroPDF417 variant at its exact data and ECC boundary', () => {
  for (const variant of MICRO_PDF417_VARIANTS) {
    const payload = 'A'.repeat((variant.dataCapacity - 1) * 2)
    const result = new MicroPdf417Core(payload, {
      variant: variant.id,
      mode: 'text',
    }).generate()

    assert.equal(result.variant, variant.id)
    assert.equal(result.compactedCodewords.length, variant.dataCapacity, variant.id)
    assert.equal(result.dataCodewords.length, variant.dataCapacity, variant.id)
    assert.equal(result.errorCodewords.length, variant.errorCodewords, variant.id)
    assert.equal(result.codewords.length, variant.rows * variant.dataColumns, variant.id)
    assertBooleanMatrix(result)

    assert.throws(
      () => new MicroPdf417Core(`${payload}AA`, {
        variant: variant.id,
        mode: 'text',
      }).generate(),
      /exceeds.*capacity/i,
      variant.id,
    )
  }
})

test('selects the first smallest-capacity MicroPDF417 variant at every transition', () => {
  const capacities = [...new Set(MICRO_PDF417_VARIANTS.map((variant) => variant.dataCapacity))]
  for (const capacity of capacities) {
    const payload = 'A'.repeat((capacity - 1) * 2)
    const expected = MICRO_PDF417_VARIANTS.find((variant) => variant.dataCapacity >= capacity)
    const result = new MicroPdf417Core(payload, { mode: 'text' }).generate()
    assert.equal(result.compactedCodewords.length, capacity)
    assert.equal(result.variant, expected.id, `capacity ${capacity}`)
  }
})

test('accepts forced MicroPDF417 dimensions and never substitutes another size', () => {
  assert.equal(new MicroPdf417Core('HELLO', { variant: '2x11' }).generate().variant, '2x11')
  assert.equal(new MicroPdf417Core('HELLO', { columns: 3, rows: 10 }).generate().variant, '3x10')
  assert.equal(new MicroPdf417Core('HELLO', { columns: 4 }).generate().dataColumns, 4)

  assert.throws(
    () => new MicroPdf417Core('HELLO', { variant: '2x11', rows: 14 }).generate(),
    /conflicts/,
  )
  assert.throws(
    () => new MicroPdf417Core('HELLO', { columns: 2, rows: 10 }).generate(),
    /Unsupported MicroPDF417 size/,
  )
  assert.throws(
    () => new MicroPdf417Core('HELLO', { variant: '11x2' }).generate(),
    /Unsupported MicroPDF417 variant/,
  )
})

test('matches independent BWIPP module references for all MicroPDF417 variants', () => {
  for (const variant of MICRO_PDF417_VARIANTS) {
    const result = new MicroPdf417Core('A', {
      variant: variant.id,
      mode: 'byte',
    }).generate()
    assert.equal(matrixFingerprint(result.modules), MICRO_REFERENCE_FINGERPRINTS[variant.id], variant.id)
  }
})

test('exposes the correct MicroPDF417 row-address and cluster sequence', () => {
  const result = new MicroPdf417Core('ROW ADDRESS', { variant: '3x20' }).generate()
  assert.deepEqual(result.rowAddressPatterns[0], { cluster: 0, left: 1, center: 17, right: 33 })
  assert.deepEqual(result.rowAddressPatterns[1], { cluster: 1, left: 2, center: 18, right: 34 })
  assert.deepEqual(result.rowAddressPatterns[2], { cluster: 2, left: 3, center: 19, right: 35 })
  assert.deepEqual(result.rowAddressPatterns[19], { cluster: 1, left: 20, center: 36, right: 52 })
})

test('compacts text, bytes, numeric data, and mixed mode deterministically', () => {
  assert.deepEqual(encodePdf417Text('HELLO WORLD'), [214, 341, 446, 674, 521, 119])
  assert.deepEqual(encodePdf417Bytes(Uint8Array.from([0, 1, 2, 3, 4, 5])), [924, 0, 5, 844, 88, 165])
  assert.deepEqual(
    encodePdf417Numeric('123456789012345678901234567890'),
    [902, 3, 199, 754, 458, 122, 321, 197, 493, 169, 753, 190],
  )
  assert.deepEqual(
    compactPdf417('ABC1234567890123xyz'),
    [901, 65, 66, 67, 902, 17, 110, 836, 811, 223, 900, 833, 745],
  )
})

test('uses compact text submode shifts and validates forced compaction modes', () => {
  assert.ok(encodePdf417Text('aAaAaA').length < encodePdf417Bytes('aAaAaA').length)
  assert.throws(() => compactPdf417('12A', { mode: 'numeric' }), /ASCII digits only/)
  assert.throws(() => compactPdf417('é', { mode: 'text' }), /Text compaction cannot encode byte/)
  assert.throws(() => compactPdf417('data', { mode: 'unknown' }), /Unsupported PDF417 compaction mode/)
})

test('handles long numeric runs and arbitrary binary bytes', () => {
  const numeric = new MicroPdf417Core('1234567890'.repeat(20), { mode: 'numeric' }).generate()
  const binaryPayload = Uint8Array.from({ length: 128 }, (_, index) => (index * 73) & 0xff)
  const binary = new MicroPdf417Core(binaryPayload, { mode: 'byte', variant: '4x44' }).generate()

  assert.equal(numeric.compactedCodewords[0], 902)
  assert.equal(binary.compactedCodewords[0], 901)
  assert.deepEqual(binary.bytes, binaryPayload)
  assertBooleanMatrix(numeric)
  assertBooleanMatrix(binary)
})

test('supports the standardized maximum MicroPDF417 payload classes', () => {
  const numeric = new MicroPdf417Core('1'.repeat(366), { mode: 'numeric' }).generate()
  const text = new MicroPdf417Core('A'.repeat(250), { mode: 'text' }).generate()
  const bytes = new MicroPdf417Core(new Uint8Array(150), { mode: 'byte' }).generate()

  assert.equal(numeric.variant, '4x44')
  assert.equal(text.variant, '4x44')
  assert.equal(bytes.variant, '4x44')
  assert.equal(numeric.compactedCodewords.length, 126)
  assert.equal(text.compactedCodewords.length, 126)
  assert.equal(bytes.compactedCodewords.length, 126)

  assert.throws(() => new MicroPdf417Core('1'.repeat(367), { mode: 'numeric' }).generate(), /capacity/)
  assert.throws(() => new MicroPdf417Core('A'.repeat(251), { mode: 'text' }).generate(), /capacity/)
  assert.throws(() => new MicroPdf417Core(new Uint8Array(151), { mode: 'byte' }).generate(), /capacity/)
})

test('generates standard PDF417 Reed-Solomon coefficients and check codewords', () => {
  assert.deepEqual(getPdf417GeneratorCoefficients(2), [27, 917])
  assert.deepEqual(getPdf417GeneratorCoefficients(4), [522, 568, 723, 809])
  assert.deepEqual(generatePdf417ErrorCorrection([5, 900, 1, 2], 2), [754, 685])
})

test('provides every codeword pattern in every PDF417 cluster', () => {
  const seen = new Set()
  for (let cluster = 0; cluster < 3; cluster += 1) {
    for (let codeword = 0; codeword <= 928; codeword += 1) {
      const pattern = getPdf417CodewordPattern(codeword, cluster)
      assert.ok(pattern >= 0x10000 && pattern <= 0x1ffff)
      seen.add(`${cluster}:${pattern}`)
    }
  }
  assert.equal(seen.size, 2787)
})

test('generates configurable standard PDF417 rows, columns, and all ECC levels', () => {
  for (let errorCorrectionLevel = 0; errorCorrectionLevel <= 8; errorCorrectionLevel += 1) {
    const result = new Pdf417Core('STANDARD PDF417 12345678901234567890', {
      errorCorrectionLevel,
    }).generate()
    assert.equal(result.errorCodewords.length, 2 ** (errorCorrectionLevel + 1))
    assert.equal(result.codewords.length, result.rows * result.dataColumns)
    assertBooleanMatrix(result)
  }

  const fixed = new Pdf417Core('FIXED DIMENSIONS', {
    columns: 4,
    rows: 10,
    errorCorrectionLevel: 2,
  }).generate()
  assert.equal(fixed.dataColumns, 4)
  assert.equal(fixed.rows, 10)
  assert.equal(fixed.columns, 137)
})

test('generates normal and truncated standard PDF417 layouts', () => {
  const normal = new Pdf417Core('LAYOUT', { columns: 3, rows: 8 }).generate()
  const truncated = new Pdf417Core('LAYOUT', { columns: 3, rows: 8, truncated: true }).generate()

  assert.equal(normal.columns, 69 + 17 * 3)
  assert.equal(truncated.columns, 35 + 17 * 3)
  assert.equal(normal.rows, truncated.rows)
  assertBooleanMatrix(normal)
  assertBooleanMatrix(truncated)
})

test('matches an independent BWIPP standard PDF417 module reference', () => {
  const result = new Pdf417Core('PDF417 REFERENCE 12345678901234567890', {
    columns: 4,
    rows: 10,
    errorCorrectionLevel: 2,
  }).generate()
  assert.equal(
    matrixFingerprint(result.modules),
    'b5aa45a13d60cceaf4f1d94e9807adbde516895f5b46022634f9b66bd48f2c87',
  )
})

test('independent ZXing decoder reads the native standard PDF417 matrix', () => {
  const payload = 'PDF417 INDEPENDENT 12345678901234567890'
  const result = new Pdf417Core(payload, {
    columns: 4,
    errorCorrectionLevel: 2,
  }).generate()
  const decoded = new PDF417Reader().decode(toPdf417Bitmap(result.modules))
  assert.equal(decoded.getText(), payload)
})

test('rejects overflow and invalid parameters without silently changing them', () => {
  assert.throws(() => new MicroPdf417Core('A'.repeat(1000)).generate(), /exceeds MicroPDF417 capacity/)
  assert.throws(() => new MicroPdf417Core('').generate(), /must not be empty/)
  assert.throws(() => new Pdf417Core('').generate(), /must not be empty/)
  assert.throws(() => new Pdf417Core('data', { errorCorrectionLevel: 9 }).generate(), /between 0 and 8/)
  assert.throws(() => new Pdf417Core('data', { columns: 0 }).generate(), /between 1 and 30/)
  assert.throws(() => new Pdf417Core('data', { rows: 91 }).generate(), /between 3 and 90/)
  assert.throws(
    () => new Pdf417Core('A'.repeat(100), { columns: 1, rows: 3 }).generate(),
    /requires .* codewords.*holds 3/,
  )
})

test('returns stable codewords and module matrices on repeated generation', () => {
  const micro = new MicroPdf417Core('STABLE 12345678901234567890', { variant: '3x12' })
  const standard = new Pdf417Core('STABLE 12345678901234567890', { columns: 4, rows: 10 })
  assert.deepEqual(micro.generate(), micro.generate())
  assert.deepEqual(standard.generate(), standard.generate())
})
