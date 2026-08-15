// Native GS1 Composite 2D component (CC-A, CC-B and CC-C).

import { encodePdf417Bytes } from './PDF417Compaction.js'
import { generatePdf417ErrorCorrection } from './PDF417ErrorCorrection.js'
import {
  MICRO_PDF417_VARIANTS,
  PDF417_PAD_CODEWORD,
  buildMicroPdf417Matrix,
  buildPdf417Matrix,
} from './PDF417core.js'
import { compactGs1Composite } from './GS1CompositeCompaction.js'

const CC_LINKAGE_CODEWORD = 920

const CC_A_METRIC_ROWS = Object.freeze([
  [2, 5, 4, 39, 0, 19], [2, 6, 4, 1, 0, 33], [2, 7, 5, 32, 0, 12],
  [2, 8, 5, 8, 0, 40], [2, 9, 6, 14, 0, 46], [2, 10, 6, 43, 0, 23],
  [2, 12, 7, 20, 0, 52], [3, 4, 4, 11, 43, 23], [3, 5, 5, 1, 33, 13],
  [3, 6, 6, 5, 37, 17], [3, 7, 7, 15, 47, 27], [3, 8, 7, 21, 1, 33],
  [4, 3, 4, 40, 20, 52], [4, 4, 5, 43, 23, 3], [4, 5, 6, 46, 26, 6],
  [4, 6, 7, 34, 14, 46], [4, 7, 8, 29, 9, 41],
])

export const GS1_CC_A_VARIANTS = Object.freeze(CC_A_METRIC_ROWS.map((entry) => {
  const [dataColumns, rows, errorCodewords, rapLeft, rapCenter, rapRight] = entry
  return Object.freeze({
    id: `A-${dataColumns}x${rows}`,
    dataColumns,
    rows,
    errorCodewords,
    dataCapacity: dataColumns * rows - errorCodewords,
    moduleColumns: dataColumns === 3 ? 72 : [0, 38, 55, 82, 99][dataColumns],
    rowAddressStarts: Object.freeze({ left: rapLeft, center: rapCenter, right: rapRight }),
  })
}))

export class Gs1CompositeCore {
  constructor(data, options = {}) {
    this.data = data
    this.options = {
      version: 'auto',
      columns: 2,
      ...options,
    }
  }

  generate() {
    const compacted = compactGs1Composite(this.data, this.options)
    if (compacted.version === 'a') return buildCcA(this.data, compacted)
    if (compacted.version === 'b') return buildCcB(this.data, compacted)
    return buildCcC(this.data, compacted)
  }
}

export const GS1CompositeCore = Gs1CompositeCore

function buildCcA(data, compacted) {
  const dataCodewords = bitsToBase928Codewords(compacted.bits)
  const variant = GS1_CC_A_VARIANTS.find((candidate) => (
    candidate.dataColumns === compacted.columns && candidate.dataCapacity === dataCodewords.length
  ))
  if (!variant) throw new Error('No CC-A layout matches the compacted GS1 data.')

  const errorCodewords = generatePdf417ErrorCorrection(dataCodewords, variant.errorCodewords)
  const codewords = [...dataCodewords, ...errorCodewords]
  const layout = buildMicroPdf417Matrix(codewords, variant, { omitLeftRapForThreeColumns: true })
  return formatResult(data, compacted, variant, layout, dataCodewords, errorCodewords, codewords)
}

function buildCcB(data, compacted) {
  const bytes = bitsToBytes(compacted.bits)
  const rawData = [CC_LINKAGE_CODEWORD, ...encodePdf417Bytes(bytes)]
  const variant = MICRO_PDF417_VARIANTS.find((candidate) => (
    candidate.dataColumns === compacted.columns && candidate.dataCapacity >= rawData.length
  ))
  if (!variant) throw new Error('No CC-B layout matches the compacted GS1 data.')

  const dataCodewords = [
    ...rawData,
    ...new Array(variant.dataCapacity - rawData.length).fill(PDF417_PAD_CODEWORD),
  ]
  const errorCodewords = generatePdf417ErrorCorrection(dataCodewords, variant.errorCodewords)
  const codewords = [...dataCodewords, ...errorCodewords]
  const layout = buildMicroPdf417Matrix(codewords, variant)
  return formatResult(data, compacted, variant, layout, dataCodewords, errorCodewords, codewords)
}

function buildCcC(data, compacted) {
  const bytes = bitsToBytes(compacted.bits)
  const rawData = [CC_LINKAGE_CODEWORD, ...encodePdf417Bytes(bytes)]
  const errorCorrectionLevel = Math.log2(compacted.errorCodewords) - 1
  const rows = compacted.rows
  const capacity = compacted.columns * rows
  const dataCapacity = capacity - compacted.errorCodewords
  if (rawData.length + 1 > dataCapacity) throw new Error('No CC-C layout matches the compacted GS1 data.')

  const dataCodewords = [
    dataCapacity,
    ...rawData,
    ...new Array(dataCapacity - rawData.length - 1).fill(PDF417_PAD_CODEWORD),
  ]
  const errorCodewords = generatePdf417ErrorCorrection(dataCodewords, compacted.errorCodewords)
  const codewords = [...dataCodewords, ...errorCodewords]
  const modules = buildPdf417Matrix(
    codewords,
    compacted.columns,
    rows,
    errorCorrectionLevel,
    false,
  )
  const variant = Object.freeze({
    id: `C-${compacted.columns}x${rows}-ecl${errorCorrectionLevel}`,
    dataColumns: compacted.columns,
    rows,
    errorCodewords: compacted.errorCodewords,
    dataCapacity,
    moduleColumns: modules[0].length,
  })
  return formatResult(data, compacted, variant, { modules }, dataCodewords, errorCodewords, codewords, {
    errorCorrectionLevel,
  })
}

function formatResult(data, compacted, variant, layout, dataCodewords, errorCodewords, codewords, extra = {}) {
  return {
    data,
    modules: layout.modules,
    rows: variant.rows,
    columns: layout.modules[0].length,
    dataColumns: variant.dataColumns,
    dataCodewords,
    errorCodewords,
    codewords,
    bits: compacted.bits,
    bitCapacity: compacted.bitCapacity,
    version: `CC-${compacted.version.toUpperCase()}`,
    variant: variant.id,
    method: compacted.method,
    elements: compacted.elements,
    rowAddressPatterns: layout.rowAddressPatterns,
    ...extra,
  }
}

function bitsToBase928Codewords(bits) {
  const output = []
  for (let position = 0; position < bits.length; position += 69) {
    const chunk = bits.slice(position, position + 69)
    const count = Math.floor(chunk.length / 10) + 1
    let value = 0n
    for (const bit of chunk) value = value * 2n + BigInt(bit)
    const codewords = new Array(count).fill(0)
    for (let index = count - 1; index >= 0; index -= 1) {
      codewords[index] = Number(value % 928n)
      value /= 928n
    }
    output.push(...codewords)
  }
  return output
}

function bitsToBytes(bits) {
  if (bits.length % 8 !== 0) throw new Error('CC-B and CC-C bit capacities must be byte-aligned.')
  const bytes = new Uint8Array(bits.length / 8)
  for (let index = 0; index < bytes.length; index += 1) {
    let value = 0
    for (let bit = 0; bit < 8; bit += 1) value = value * 2 + bits[index * 8 + bit]
    bytes[index] = value
  }
  return bytes
}
