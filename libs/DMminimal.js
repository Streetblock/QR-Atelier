const ASCII = 0
const C40 = 1
const TEXT = 2
const X12 = 3
const EDIFACT = 4
const BASE256 = 5

const SHIFT2 = new Set(Array.from('!"#$%&\'()*+,-./:;<=>?@[\\]^_').map((character) => character.charCodeAt(0)))

export function encodeMinimalDataMatrix(data, capacities) {
  const input = new DmInput(data, capacities)
  const edges = Array.from({ length: input.length + 1 }, () => new Array(6).fill(null))
  addEdges(input, edges, 0, null)

  for (let position = 1; position <= input.length; position += 1) {
    if (position < input.length) {
      for (const previous of edges[position]) {
        if (previous) addEdges(input, edges, position, previous)
      }
    }
  }

  let solution = null
  let solutionSize = Infinity
  for (let mode = ASCII; mode <= BASE256; mode += 1) {
    const edge = edges[input.length][mode]
    if (!edge) continue
    let size = mode >= C40 && mode <= X12 ? edge.totalSize + 1 : edge.totalSize
    if (mode === EDIFACT && edge.remaining(edge.totalSize) > 0) size += 3
    if (size < solutionSize) {
      solution = edge
      solutionSize = size
    }
  }
  if (!solution) throw new Error('Unable to encode Data Matrix input.')
  return buildResult(solution)
}

function addEdges(input, edges, from, previous) {
  const character = input.at(from)
  if (previous === null || previous.endMode() !== EDIFACT) {
    const asciiLength = isDigit(character) && input.has(from, 2) && isDigit(input.at(from + 1)) ? 2 : 1
    addEdge(edges, new Edge(input, ASCII, from, asciiLength, previous))

    for (const mode of [C40, TEXT]) {
      const segment = c40SegmentLength(input, from, mode === C40)
      if (segment.length > 0) addEdge(edges, new Edge(input, mode, from, segment.length, previous, segment.words))
    }
    if (input.has(from, 3) && [0, 1, 2].every((offset) => isNativeX12(input.at(from + offset)))) {
      addEdge(edges, new Edge(input, X12, from, 3, previous))
    }
    addEdge(edges, new Edge(input, BASE256, from, 1, previous))
  }

  let length = 0
  while (length < 3 && input.has(from + length, 1) && isNativeEdifact(input.at(from + length))) {
    length += 1
    addEdge(edges, new Edge(input, EDIFACT, from, length, previous))
  }
  if (length === 3 && input.has(from, 4) && isNativeEdifact(input.at(from + 3))) {
    addEdge(edges, new Edge(input, EDIFACT, from, 4, previous))
  }
}

function addEdge(edges, edge) {
  const end = edge.from + edge.length
  const mode = edge.endMode()
  if (!edges[end][mode] || edge.totalSize < edges[end][mode].totalSize) edges[end][mode] = edge
}

function c40SegmentLength(input, from, c40) {
  let valueCount = 0
  for (let index = from; index < input.length; index += 1) {
    const character = input.at(index)
    if ((c40 && isNativeC40(character)) || (!c40 && isNativeText(character))) {
      valueCount += 1
    } else if (!isExtended(character)) {
      valueCount += 2
    } else {
      const base = character - 128
      valueCount += ((c40 && isNativeC40(base)) || (!c40 && isNativeText(base))) ? 3 : 4
    }
    if (valueCount % 3 === 0 || (valueCount % 3 === 2 && index + 1 === input.length)) {
      return { length: index - from + 1, words: Math.ceil(valueCount / 3) }
    }
  }
  return { length: 0, words: 0 }
}

class DmInput {
  constructor(data, capacities) {
    this.characters = Array.from(data, (character) => character.charCodeAt(0))
    const unsupported = this.characters.find((character) => character > 255)
    if (unsupported !== undefined) {
      throw new Error('DmCore currently supports ISO-8859-1 input only.')
    }
    this.capacities = capacities
    this.length = this.characters.length
  }

  at(position) {
    return this.characters[position]
  }

  has(position, count) {
    return position >= 0 && position + count <= this.length
  }

  capacityFor(minimum) {
    return this.capacities.find((capacity) => capacity >= minimum) ?? this.capacities.at(-1)
  }
}

class Edge {
  constructor(input, mode, from, length, previous, c40Words = 0) {
    this.input = input
    this.mode = mode
    this.from = from
    this.length = length
    this.previous = previous
    this.c40Words = c40Words

    const previousMode = this.previousMode()
    let size = previous?.totalSize ?? 0
    if (mode === ASCII) {
      size += isExtended(input.at(from)) ? 2 : 1
      if ([C40, TEXT, X12].includes(previousMode)) size += 1
    } else if (mode === BASE256) {
      size += 1
      if (previousMode !== BASE256) size += 1
      else if (this.base256Length() === 250) size += 1
      if (previousMode === ASCII) size += 1
      else if ([C40, TEXT, X12].includes(previousMode)) size += 2
    } else if ([C40, TEXT, X12].includes(mode)) {
      size += mode === X12 ? 2 : c40Words * 2
      if (previousMode === ASCII || previousMode === BASE256) size += 1
      else if (previousMode !== mode && [C40, TEXT, X12].includes(previousMode)) size += 2
    } else if (mode === EDIFACT) {
      size += 3
      if (previousMode === ASCII || previousMode === BASE256) size += 1
      else if ([C40, TEXT, X12].includes(previousMode)) size += 2
    }
    this.totalSize = size
  }

  base256Length() {
    let count = 0
    let edge = this
    while (edge && edge.mode === BASE256 && count <= 250) {
      count += 1
      edge = edge.previous
    }
    return count
  }

  previousStartMode() {
    return this.previous?.mode ?? ASCII
  }

  previousMode() {
    return this.previous?.endMode() ?? ASCII
  }

  endMode() {
    if (this.mode === EDIFACT) {
      if (this.length < 4) return ASCII
      const last = this.lastAsciiCost()
      if (last > 0 && this.remaining(this.totalSize + last) <= 2 - last) return ASCII
    }
    if ([C40, TEXT, X12].includes(this.mode)) {
      if (this.from + this.length >= this.input.length && this.remaining(this.totalSize) === 0) return ASCII
      const last = this.lastAsciiCost()
      if (last === 1 && this.remaining(this.totalSize + 1) === 0) return ASCII
    }
    return this.mode
  }

  remaining(minimum) {
    return this.input.capacityFor(minimum) - minimum
  }

  lastAsciiCost() {
    const from = this.from + this.length
    const remaining = this.input.length - from
    if (remaining > 4 || remaining < 1) return 0
    if (remaining === 1) return isExtended(this.input.at(from)) ? 0 : 1
    if (remaining === 2) {
      if (isExtended(this.input.at(from)) || isExtended(this.input.at(from + 1))) return 0
      return isDigit(this.input.at(from)) && isDigit(this.input.at(from + 1)) ? 1 : 2
    }
    if (remaining === 3) {
      if (isDigit(this.input.at(from)) && isDigit(this.input.at(from + 1)) && !isExtended(this.input.at(from + 2))) return 2
      if (isDigit(this.input.at(from + 1)) && isDigit(this.input.at(from + 2)) && !isExtended(this.input.at(from))) return 2
      return 0
    }
    return [0, 1, 2, 3].every((offset) => isDigit(this.input.at(from + offset))) ? 2 : 0
  }

  latchBytes() {
    const previous = this.previousMode()
    if (previous === ASCII || previous === BASE256) {
      return this.mode === BASE256 ? [231]
        : this.mode === C40 ? [230]
          : this.mode === TEXT ? [239]
            : this.mode === X12 ? [238]
              : this.mode === EDIFACT ? [240] : []
    }
    if ([C40, TEXT, X12].includes(previous) && this.mode !== previous) {
      return this.mode === ASCII ? [254]
        : this.mode === BASE256 ? [254, 231]
          : this.mode === C40 ? [254, 230]
            : this.mode === TEXT ? [254, 239]
              : this.mode === X12 ? [254, 238]
                : [254, 240]
    }
    if (previous === EDIFACT && this.mode !== EDIFACT) throw new Error('Invalid EDIFACT transition.')
    return []
  }

  dataBytes() {
    const character = this.input.at(this.from)
    if (this.mode === ASCII) {
      if (isExtended(character)) return [235, character - 127]
      if (this.length === 2) {
        return [(character - 48) * 10 + (this.input.at(this.from + 1) - 48) + 130]
      }
      return [character + 1]
    }
    if (this.mode === BASE256) return [character]
    if (this.mode === C40 || this.mode === TEXT) return c40Bytes(this.input, this.from, this.length, this.mode === C40)
    if (this.mode === X12) return x12Bytes(this.input, this.from, this.length)
    return edifactBytes(this.input, this.from, this.length)
  }
}

function buildResult(solution) {
  const needsEdifactUnlatch = solution.endMode() === EDIFACT && solution.remaining(solution.totalSize) > 0
  const bytes = needsEdifactUnlatch ? [124, 0, 0] : []
  let segmentSize = 0
  const base256Segments = []
  if ([C40, TEXT, X12].includes(solution.mode) && solution.endMode() !== ASCII) prepend(bytes, [254])

  for (let edge = solution; edge; edge = edge.previous) {
    segmentSize += prepend(bytes, edge.dataBytes())
    if (!edge.previous || edge.previousStartMode() !== edge.mode) {
      if (edge.mode === BASE256) {
        if (segmentSize <= 249) {
          bytes.unshift(segmentSize)
          segmentSize += 1
        } else {
          bytes.unshift(segmentSize % 250)
          bytes.unshift(Math.floor(segmentSize / 250) + 249)
          segmentSize += 2
        }
        base256Segments.push({ postfix: bytes.length, length: segmentSize })
      }
      prepend(bytes, edge.latchBytes())
      segmentSize = 0
    }
  }

  for (const segment of base256Segments) {
    randomizeBase256(bytes, bytes.length - segment.postfix, segment.length)
  }
  const unpaddedLength = bytes.length
  const capacity = solution.input.capacityFor(bytes.length)
  if (bytes.length < capacity) bytes.push(129)
  while (bytes.length < capacity) bytes.push(randomizePad(bytes.length + 1))
  return { codewords: bytes, unpaddedLength }
}

function prepend(target, values) {
  for (let index = values.length - 1; index >= 0; index -= 1) target.unshift(values[index])
  return values.length
}

function c40Bytes(input, from, length, c40) {
  const values = []
  for (let offset = 0; offset < length; offset += 1) appendC40Values(values, input.at(from + offset), c40)
  if (values.length % 3 === 2) values.push(0)
  if (values.length % 3 !== 0) throw new Error('Invalid C40/Text segment.')
  const result = []
  for (let index = 0; index < values.length; index += 3) {
    const packed = 1600 * values[index] + 40 * values[index + 1] + values[index + 2] + 1
    result.push(Math.floor(packed / 256), packed % 256)
  }
  return result
}

function appendC40Values(values, character, c40) {
  if (isExtended(character)) {
    values.push(1, 30)
    appendC40Values(values, character - 128, c40)
    return
  }
  if ((c40 && isNativeC40(character)) || (!c40 && isNativeText(character))) {
    values.push(c40Value(character, c40, 0))
    return
  }
  const shift = character <= 31 ? 0 : SHIFT2.has(character) ? 1 : 2
  values.push(shift, c40Value(character, c40, shift))
}

function c40Value(character, c40, shift) {
  if (c40) {
    if (character <= 31) return character
    if (character === 32) return 3
    if (character <= 47) return character - 33
    if (character <= 57) return character - 44
    if (character <= 64) return character - 43
    if (character <= 90) return character - 51
    if (character <= 95) return character - 69
    return character - 96
  }
  if (character === 0) return 0
  if (shift === 0 && character <= 3) return character - 1
  if (shift === 1 && character <= 31) return character
  if (character === 32) return 3
  if (character <= 47) return character - 33
  if (character <= 57) return character - 44
  if (character <= 64) return character - 43
  if (character <= 90) return character - 64
  if (character <= 95) return character - 69
  if (character === 96) return 0
  if (character <= 122) return character - 83
  return character - 96
}

function x12Bytes(input, from, length) {
  const values = []
  for (let offset = 0; offset < length; offset += 1) values.push(x12Value(input.at(from + offset)))
  const result = []
  for (let index = 0; index < values.length; index += 3) {
    const packed = 1600 * values[index] + 40 * values[index + 1] + values[index + 2] + 1
    result.push(Math.floor(packed / 256), packed % 256)
  }
  return result
}

function x12Value(character) {
  if (character === 13) return 0
  if (character === 42) return 1
  if (character === 62) return 2
  if (character === 32) return 3
  if (character <= 57) return character - 44
  return character - 51
}

function edifactBytes(input, from, length) {
  const values = []
  for (let offset = 0; offset < 4; offset += 1) {
    values.push(offset < length ? input.at(from + offset) & 0x3f : offset === length ? 0x1f : 0)
  }
  const packed = (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3]
  return [(packed >>> 16) & 0xff, (packed >>> 8) & 0xff, packed & 0xff]
}

function randomizeBase256(bytes, start, length) {
  for (let offset = 0; offset < length; offset += 1) {
    const position = start + offset
    const randomized = bytes[position] + ((149 * (position + 1)) % 255) + 1
    bytes[position] = randomized <= 255 ? randomized : randomized - 256
  }
}

function randomizePad(position) {
  const value = 129 + ((149 * position) % 253) + 1
  return value <= 254 ? value : value - 254
}

function isDigit(character) {
  return character >= 48 && character <= 57
}

function isExtended(character) {
  return character >= 128 && character <= 255
}

function isNativeC40(character) {
  return character === 32 || isDigit(character) || (character >= 65 && character <= 90)
}

function isNativeText(character) {
  return character === 32 || isDigit(character) || (character >= 97 && character <= 122)
}

function isNativeX12(character) {
  return character === 13 || character === 42 || character === 62 || isNativeC40(character)
}

function isNativeEdifact(character) {
  return character >= 32 && character <= 94
}
