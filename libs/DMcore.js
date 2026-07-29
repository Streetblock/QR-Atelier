// ==========================================
// DMcore.js - Dependency-free Data Matrix ECC200 Generator
// Compact square-symbol build with ASCII encoding
// ==========================================

const DM_SYMBOLS = [
  { rows: 10, cols: 10, regionRows: 8, regionCols: 8, regionCountRows: 1, regionCountCols: 1, dataCodewords: 3, errorCodewords: 5, rsBlockData: 3, rsBlockError: 5 },
  { rows: 12, cols: 12, regionRows: 10, regionCols: 10, regionCountRows: 1, regionCountCols: 1, dataCodewords: 5, errorCodewords: 7, rsBlockData: 5, rsBlockError: 7 },
  { rows: 14, cols: 14, regionRows: 12, regionCols: 12, regionCountRows: 1, regionCountCols: 1, dataCodewords: 8, errorCodewords: 10, rsBlockData: 8, rsBlockError: 10 },
  { rows: 16, cols: 16, regionRows: 14, regionCols: 14, regionCountRows: 1, regionCountCols: 1, dataCodewords: 12, errorCodewords: 12, rsBlockData: 12, rsBlockError: 12 },
  { rows: 18, cols: 18, regionRows: 16, regionCols: 16, regionCountRows: 1, regionCountCols: 1, dataCodewords: 18, errorCodewords: 14, rsBlockData: 18, rsBlockError: 14 },
  { rows: 20, cols: 20, regionRows: 18, regionCols: 18, regionCountRows: 1, regionCountCols: 1, dataCodewords: 22, errorCodewords: 18, rsBlockData: 22, rsBlockError: 18 },
  { rows: 22, cols: 22, regionRows: 20, regionCols: 20, regionCountRows: 1, regionCountCols: 1, dataCodewords: 30, errorCodewords: 20, rsBlockData: 30, rsBlockError: 20 },
  { rows: 24, cols: 24, regionRows: 22, regionCols: 22, regionCountRows: 1, regionCountCols: 1, dataCodewords: 36, errorCodewords: 24, rsBlockData: 36, rsBlockError: 24 },
  { rows: 26, cols: 26, regionRows: 24, regionCols: 24, regionCountRows: 1, regionCountCols: 1, dataCodewords: 44, errorCodewords: 28, rsBlockData: 44, rsBlockError: 28 },
  { rows: 32, cols: 32, regionRows: 14, regionCols: 14, regionCountRows: 2, regionCountCols: 2, dataCodewords: 62, errorCodewords: 36, rsBlockData: 62, rsBlockError: 36 },
  { rows: 36, cols: 36, regionRows: 16, regionCols: 16, regionCountRows: 2, regionCountCols: 2, dataCodewords: 86, errorCodewords: 42, rsBlockData: 86, rsBlockError: 42 },
  { rows: 40, cols: 40, regionRows: 18, regionCols: 18, regionCountRows: 2, regionCountCols: 2, dataCodewords: 114, errorCodewords: 48, rsBlockData: 114, rsBlockError: 48 },
  { rows: 44, cols: 44, regionRows: 20, regionCols: 20, regionCountRows: 2, regionCountCols: 2, dataCodewords: 144, errorCodewords: 56, rsBlockData: 144, rsBlockError: 56 },
  { rows: 48, cols: 48, regionRows: 22, regionCols: 22, regionCountRows: 2, regionCountCols: 2, dataCodewords: 174, errorCodewords: 68, rsBlockData: 174, rsBlockError: 68 },
  { rows: 52, cols: 52, regionRows: 24, regionCols: 24, regionCountRows: 2, regionCountCols: 2, dataCodewords: 204, errorCodewords: 84, rsBlockData: 102, rsBlockError: 42 },
]

const DM_PAD = 129
const DM_PRIMITIVE = 0x12d
const DM_FACTOR_SETS = [5, 7, 10, 11, 12, 14, 18, 20, 24, 28, 36, 42, 48, 56, 62, 68]
const DM_FACTORS = [
  [228, 48, 15, 111, 62],
  [23, 68, 144, 134, 240, 92, 254],
  [28, 24, 185, 166, 223, 248, 116, 255, 110, 61],
  [175, 138, 205, 12, 194, 168, 39, 245, 60, 97, 120],
  [41, 153, 158, 91, 61, 42, 142, 213, 97, 178, 100, 242],
  [156, 97, 192, 252, 95, 9, 157, 119, 138, 45, 18, 186, 83, 185],
  [83, 195, 100, 39, 188, 75, 66, 61, 241, 213, 109, 129, 94, 254, 225, 48, 90, 188],
  [15, 195, 244, 9, 233, 71, 168, 2, 188, 160, 153, 145, 253, 79, 108, 82, 27, 174, 186, 172],
  [52, 190, 88, 205, 109, 39, 176, 21, 155, 197, 251, 223, 155, 21, 5, 172, 254, 124, 12, 181, 184, 96, 50, 193],
  [211, 231, 43, 97, 71, 96, 103, 174, 37, 151, 170, 53, 75, 34, 249, 121, 17, 138, 110, 213, 141, 136, 120, 151, 233, 168, 93, 255],
  [245, 127, 242, 218, 130, 250, 162, 181, 102, 120, 84, 179, 220, 251, 80, 182, 229, 18, 2, 4, 68, 33, 101, 137, 95, 119, 115, 44, 175, 184, 59, 25, 225, 98, 81, 112],
  [77, 193, 137, 31, 19, 38, 22, 153, 247, 105, 122, 2, 245, 133, 242, 8, 175, 95, 100, 9, 167, 105, 214, 111, 57, 121, 21, 1, 253, 57, 54, 101, 248, 202, 69, 50, 150, 177, 226, 5, 9, 5],
  [245, 132, 172, 223, 96, 32, 117, 22, 238, 133, 238, 231, 205, 188, 237, 87, 191, 106, 16, 147, 118, 23, 37, 90, 170, 205, 131, 88, 120, 100, 66, 138, 186, 240, 82, 44, 176, 87, 187, 147, 160, 175, 69, 213, 92, 253, 225, 19],
  [175, 9, 223, 238, 12, 17, 220, 208, 100, 29, 175, 170, 230, 192, 215, 235, 150, 159, 36, 223, 38, 200, 132, 54, 228, 146, 218, 234, 117, 203, 29, 232, 144, 238, 22, 150, 201, 117, 62, 207, 164, 13, 137, 245, 127, 67, 247, 28, 155, 43, 203, 107, 233, 53, 143, 46],
  [242, 93, 169, 50, 144, 210, 39, 118, 202, 188, 201, 189, 143, 108, 196, 37, 185, 112, 134, 230, 245, 63, 197, 190, 250, 106, 185, 221, 175, 64, 114, 71, 161, 44, 147, 6, 27, 218, 51, 63, 87, 10, 40, 130, 188, 17, 163, 31, 176, 170, 4, 107, 232, 7, 94, 166, 224, 124, 86, 47, 11, 204],
  [220, 228, 173, 89, 251, 149, 159, 56, 89, 33, 147, 244, 154, 36, 73, 127, 213, 136, 248, 180, 234, 197, 158, 177, 68, 122, 93, 213, 15, 160, 227, 236, 66, 139, 153, 185, 202, 167, 179, 25, 220, 232, 96, 210, 231, 136, 223, 239, 181, 241, 59, 52, 172, 25, 49, 232, 211, 189, 64, 54, 108, 153, 132, 63, 96, 103, 82, 186],
]
const DM_LOG = new Array(256).fill(0)
const DM_ALOG = new Array(255).fill(0)
initDmGaloisTables()

export class DmCore {
  constructor(data, options = {}) {
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Data Matrix data must be a non-empty string.')
    }

    this.data = data
    this.options = {
      minSize: 10,
      maxSize: 52,
      ...options,
    }
  }

  generate() {
    const minSize = normalizeSymbolSize(this.options.minSize)
    const maxSize = normalizeSymbolSize(this.options.maxSize)

    if (minSize > maxSize) {
      throw new Error('minSize must be less than or equal to maxSize.')
    }

    const encoded = encodeAsciiDataMatrix(this.data)
    const symbol = chooseSymbol(encoded.length, minSize, maxSize)
    const dataCodewords = finalizeDataCodewords(encoded, symbol.dataCodewords)
    const allCodewords = appendEcc200(dataCodewords, symbol)
    const modules = buildMatrix(allCodewords, symbol)

    return {
      data: this.data,
      format: 'datamatrix',
      size: symbol.rows,
      rows: symbol.rows,
      cols: symbol.cols,
      symbol,
      modules,
    }
  }
}

function normalizeSymbolSize(value) {
  const numeric = Number(value)
  if (!Number.isInteger(numeric)) {
    throw new Error('Symbol size must be an integer.')
  }
  const exists = DM_SYMBOLS.some((symbol) => symbol.rows === numeric && symbol.cols === numeric)
  if (!exists) {
    throw new Error(`Unsupported square Data Matrix size: ${value}`)
  }
  return numeric
}

function chooseSymbol(codewordLength, minSize, maxSize) {
  const symbol = DM_SYMBOLS.find((candidate) => {
    return (
      candidate.rows >= minSize &&
      candidate.rows <= maxSize &&
      codewordLength <= candidate.dataCodewords
    )
  })

  if (!symbol) {
    throw new Error('Input is too large for the compact Data Matrix build.')
  }

  return symbol
}

function encodeAsciiDataMatrix(data) {
  const codewords = []
  let index = 0

  while (index < data.length) {
    const first = data.charCodeAt(index)
    const second = index + 1 < data.length ? data.charCodeAt(index + 1) : -1

    if (isDigit(first) && isDigit(second)) {
      const value = (first - 48) * 10 + (second - 48)
      codewords.push(130 + value)
      index += 2
      continue
    }

    if (first >= 0 && first <= 127) {
      codewords.push(first + 1)
      index += 1
      continue
    }

    if (first >= 128 && first <= 255) {
      codewords.push(235, first - 127)
      index += 1
      continue
    }

    throw new Error('Compact DMcore currently supports only Latin-1 / extended ASCII input.')
  }

  return codewords
}

function finalizeDataCodewords(codewords, capacity) {
  const result = codewords.slice()
  if (result.length > capacity) {
    throw new Error('Encoded data exceeds the selected symbol capacity.')
  }

  if (result.length < capacity) {
    result.push(DM_PAD)
  }

  while (result.length < capacity) {
    result.push(randomizePadCodeword(result.length + 1))
  }

  return result
}

function appendEcc200(dataCodewords, symbol) {
  const blockCount = symbol.dataCodewords / symbol.rsBlockData
  if (!Number.isInteger(blockCount) || blockCount < 1) {
    throw new Error('Invalid RS block configuration for Data Matrix symbol.')
  }

  const result = dataCodewords.slice()
  const totalLength = symbol.dataCodewords + symbol.errorCodewords
  while (result.length < totalLength) {
    result.push(0)
  }

  if (blockCount === 1) {
    const ecc = createEccBlock(dataCodewords, symbol.rsBlockError)
    for (let i = 0; i < ecc.length; i += 1) {
      result[symbol.dataCodewords + i] = ecc[i]
    }
    return result
  }

  for (let block = 0; block < blockCount; block += 1) {
    const tempData = []
    for (let d = block; d < symbol.dataCodewords; d += blockCount) {
      tempData.push(dataCodewords[d])
    }
    const ecc = createEccBlock(tempData, symbol.rsBlockError)
    let pos = 0
    for (let e = block; e < symbol.rsBlockError * blockCount; e += blockCount) {
      result[symbol.dataCodewords + e] = ecc[pos]
      pos += 1
    }
  }

  return result
}

function createEccBlock(data, numEcWords) {
  const factorIndex = DM_FACTOR_SETS.indexOf(numEcWords)
  if (factorIndex < 0) {
    throw new Error(`Unsupported ECC word count: ${numEcWords}`)
  }
  const poly = DM_FACTORS[factorIndex]
  const ecc = new Array(numEcWords).fill(0)

  for (let i = 0; i < data.length; i += 1) {
    const m = ecc[numEcWords - 1] ^ data[i]
    for (let k = numEcWords - 1; k > 0; k -= 1) {
      if (m !== 0 && poly[k] !== 0) {
        ecc[k] = ecc[k - 1] ^ dmMultiplyLog(m, poly[k])
      } else {
        ecc[k] = ecc[k - 1]
      }
    }
    if (m !== 0 && poly[0] !== 0) {
      ecc[0] = dmMultiplyLog(m, poly[0])
    } else {
      ecc[0] = 0
    }
  }

  const reversed = new Array(numEcWords)
  for (let i = 0; i < numEcWords; i += 1) {
    reversed[i] = ecc[numEcWords - i - 1]
  }
  return reversed
}

function randomizePadCodeword(position) {
  const pseudoRandom = ((149 * position) % 253) + 1
  const value = DM_PAD + pseudoRandom
  return value <= 254 ? value : value - 254
}

function buildMatrix(codewords, symbol) {
  const dataRows = symbol.regionRows * symbol.regionCountRows
  const dataCols = symbol.regionCols * symbol.regionCountCols
  const placement = createSquareArray(dataRows, dataCols, -1)

  placeCodewords(placement, codewords)

  const modules = createSquareArray(symbol.rows, symbol.cols, false)
  let matrixY = 0

  for (let y = 0; y < dataRows; y += 1) {
    if (y % symbol.regionRows === 0) {
      for (let x = 0; x < symbol.cols; x += 1) {
        modules[matrixY][x] = x % 2 === 0
      }
      matrixY += 1
    }

    let matrixX = 0
    for (let x = 0; x < dataCols; x += 1) {
      if (x % symbol.regionCols === 0) {
        modules[matrixY][matrixX] = true
        matrixX += 1
      }

      modules[matrixY][matrixX] = placement[y][x] === 1
      matrixX += 1

      if (x % symbol.regionCols === symbol.regionCols - 1) {
        modules[matrixY][matrixX] = y % 2 === 0
        matrixX += 1
      }
    }

    matrixY += 1

    if (y % symbol.regionRows === symbol.regionRows - 1) {
      for (let x = 0; x < symbol.cols; x += 1) {
        modules[matrixY][x] = true
      }
      matrixY += 1
    }
  }

  return modules
}

function placeCodewords(placement, codewords) {
  const numRows = placement.length
  const numCols = placement[0].length

  let row = 4
  let col = 0
  let position = 0

  do {
    if (row === numRows && col === 0) {
      placeCorner1(placement, codewords, position)
      position += 1
    }
    if (row === numRows - 2 && col === 0 && numCols % 4 !== 0) {
      placeCorner2(placement, codewords, position)
      position += 1
    }
    if (row === numRows - 2 && col === 0 && numCols % 8 === 4) {
      placeCorner3(placement, codewords, position)
      position += 1
    }
    if (row === numRows + 4 && col === 2 && numCols % 8 === 0) {
      placeCorner4(placement, codewords, position)
      position += 1
    }

    do {
      if (row < numRows && col >= 0 && placement[row][col] < 0) {
        placeUtah(placement, codewords, row, col, position)
        position += 1
      }
      row -= 2
      col += 2
    } while (row >= 0 && col < numCols)

    row += 1
    col += 3

    do {
      if (row >= 0 && col < numCols && placement[row][col] < 0) {
        placeUtah(placement, codewords, row, col, position)
        position += 1
      }
      row += 2
      col -= 2
    } while (row < numRows && col >= 0)

    row += 3
    col += 1
  } while (row < numRows || col < numCols)

  if (placement[numRows - 1][numCols - 1] < 0) {
    placement[numRows - 1][numCols - 1] = 1
    placement[numRows - 2][numCols - 2] = 1
  }

  for (let y = 0; y < numRows; y += 1) {
    for (let x = 0; x < numCols; x += 1) {
      if (placement[y][x] < 0) {
        placement[y][x] = 0
      }
    }
  }
}

function placeUtah(placement, codewords, row, col, position) {
  placeBit(placement, codewords, row - 2, col - 2, position, 1)
  placeBit(placement, codewords, row - 2, col - 1, position, 2)
  placeBit(placement, codewords, row - 1, col - 2, position, 3)
  placeBit(placement, codewords, row - 1, col - 1, position, 4)
  placeBit(placement, codewords, row - 1, col, position, 5)
  placeBit(placement, codewords, row, col - 2, position, 6)
  placeBit(placement, codewords, row, col - 1, position, 7)
  placeBit(placement, codewords, row, col, position, 8)
}

function placeCorner1(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 1, 0, position, 1)
  placeBit(placement, codewords, numRows - 1, 1, position, 2)
  placeBit(placement, codewords, numRows - 1, 2, position, 3)
  placeBit(placement, codewords, 0, numCols - 2, position, 4)
  placeBit(placement, codewords, 0, numCols - 1, position, 5)
  placeBit(placement, codewords, 1, numCols - 1, position, 6)
  placeBit(placement, codewords, 2, numCols - 1, position, 7)
  placeBit(placement, codewords, 3, numCols - 1, position, 8)
}

function placeCorner2(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 3, 0, position, 1)
  placeBit(placement, codewords, numRows - 2, 0, position, 2)
  placeBit(placement, codewords, numRows - 1, 0, position, 3)
  placeBit(placement, codewords, 0, numCols - 4, position, 4)
  placeBit(placement, codewords, 0, numCols - 3, position, 5)
  placeBit(placement, codewords, 0, numCols - 2, position, 6)
  placeBit(placement, codewords, 0, numCols - 1, position, 7)
  placeBit(placement, codewords, 1, numCols - 1, position, 8)
}

function placeCorner3(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 3, 0, position, 1)
  placeBit(placement, codewords, numRows - 2, 0, position, 2)
  placeBit(placement, codewords, numRows - 1, 0, position, 3)
  placeBit(placement, codewords, 0, numCols - 2, position, 4)
  placeBit(placement, codewords, 0, numCols - 1, position, 5)
  placeBit(placement, codewords, 1, numCols - 1, position, 6)
  placeBit(placement, codewords, 2, numCols - 1, position, 7)
  placeBit(placement, codewords, 3, numCols - 1, position, 8)
}

function placeCorner4(placement, codewords, position) {
  const numRows = placement.length
  const numCols = placement[0].length

  placeBit(placement, codewords, numRows - 1, 0, position, 1)
  placeBit(placement, codewords, numRows - 1, numCols - 1, position, 2)
  placeBit(placement, codewords, 0, numCols - 3, position, 3)
  placeBit(placement, codewords, 0, numCols - 2, position, 4)
  placeBit(placement, codewords, 0, numCols - 1, position, 5)
  placeBit(placement, codewords, 1, numCols - 3, position, 6)
  placeBit(placement, codewords, 1, numCols - 2, position, 7)
  placeBit(placement, codewords, 1, numCols - 1, position, 8)
}

function placeBit(placement, codewords, row, col, position, bit) {
  const numRows = placement.length
  const numCols = placement[0].length
  let wrappedRow = row
  let wrappedCol = col

  if (wrappedRow < 0) {
    wrappedRow += numRows
    wrappedCol += 4 - ((numRows + 4) % 8)
  }
  if (wrappedCol < 0) {
    wrappedCol += numCols
    wrappedRow += 4 - ((numCols + 4) % 8)
  }

  // Normalize after corner wrapping shifts. This keeps coordinates valid
  // even when the second correction step pushed row/col outside bounds.
  wrappedRow = ((wrappedRow % numRows) + numRows) % numRows
  wrappedCol = ((wrappedCol % numCols) + numCols) % numCols

  const codeword = codewords[position] ?? 0
  const value = ((codeword >> (8 - bit)) & 1) === 1 ? 1 : 0
  placement[wrappedRow][wrappedCol] = value
}

function initDmGaloisTables() {
  let p = 1
  for (let i = 0; i < 255; i += 1) {
    DM_ALOG[i] = p
    DM_LOG[p] = i
    p *= 2
    if (p >= 256) {
      p ^= DM_PRIMITIVE
    }
  }
}

function dmMultiplyLog(a, b) {
  return DM_ALOG[(DM_LOG[a] + DM_LOG[b]) % 255]
}

function isDigit(value) {
  return value >= 48 && value <= 57
}

function createSquareArray(rows, cols, initialValue) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => initialValue))
}
