import {
  GB18030_FOUR_BYTE_ENDS,
  GB18030_FOUR_BYTE_OFFSETS,
  GB18030_TWO_BYTE,
} from './gb18030Map.js';

const MODE_TYPES = ['n', 't', 'b', '1', '2', 'd', 'f'];
const MULT = 6;
const HEAD_COSTS = [4, 4, 17, 4, 4, 4, 0].map((value) => value * MULT);
const END_COSTS = [10, 6, 0, 12, 12, 15, 0].map((value) => value * MULT);
const SWITCH_COSTS = [
  [0, 14, 27, 14, 14, 14, 10],
  [10, 0, 23, 10, 10, 10, 6],
  [4, 4, 0, 4, 4, 4, 0],
  [16, 16, 29, 0, 12, 16, 12],
  [16, 16, 29, 12, 0, 16, 12],
  [19, 19, 32, 19, 19, 0, 15],
  [4, 4, 17, 4, 4, 4, 0],
].map((row) => row.map((value) => value * MULT));

function binarySearchPairs(codePoint) {
  let low = 0;
  let high = GB18030_TWO_BYTE.length / 2 - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const value = GB18030_TWO_BYTE[middle * 2];
    if (value === codePoint) return GB18030_TWO_BYTE[middle * 2 + 1];
    if (value < codePoint) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

function fourByteSequential(value, lead) {
  let quotient = Math.floor(value / 10);
  const fourth = value - quotient * 10 + 0x30;
  value = quotient;
  quotient = Math.floor(value / 126);
  const third = value - quotient * 126 + 0x81;
  value = quotient;
  quotient = Math.floor(value / 10);
  const second = value - quotient * 10 + 0x30;
  const first = quotient + lead;
  return [(first << 8) | second, (third << 8) | fourth];
}

export function unicodeToGb18030(codePoint) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    throw new RangeError(`Invalid Unicode code point U+${codePoint.toString(16).toUpperCase()}`);
  }
  if (codePoint < 0x80) return [codePoint];
  const mapped = binarySearchPairs(codePoint);
  if (mapped >= 0) return [mapped];
  if (codePoint >= 0x10000) return fourByteSequential(codePoint - 0x10000, 0x90);
  if (codePoint >= 0xe000 && codePoint <= 0xe765) {
    if (codePoint <= 0xe4c5) {
      const value = codePoint - 0xe000;
      const quotient = Math.floor(value / 94);
      return [((quotient + (quotient < 6 ? 0xaa : 0xf2)) << 8) | (value - quotient * 94 + 0xa1)];
    }
    const value = codePoint - 0xe4c6;
    const quotient = Math.floor(value / 96);
    const remainder = value - quotient * 96;
    return [((quotient + 0xa1) << 8) | (remainder + 0x40 + (remainder >= 0x3f ? 1 : 0))];
  }
  if (codePoint === 0xe7c7) return [0x8135, 0xf437];
  let low = 0;
  let high = GB18030_FOUR_BYTE_ENDS.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (GB18030_FOUR_BYTE_ENDS[middle] < codePoint) low = middle + 1;
    else high = middle;
  }
  return fourByteSequential(codePoint - GB18030_FOUR_BYTE_OFFSETS[low] - 0x80, 0x81);
}

export function normalizeHanXinInput(input) {
  if (typeof input === 'string') {
    const units = [];
    for (const character of input) units.push(...unicodeToGb18030(character.codePointAt(0)));
    if (!units.length) throw new RangeError('Han Xin data must not be empty');
    return { units, inputType: 'text', encoding: 'GB18030' };
  }
  if (input instanceof Uint8Array || ArrayBuffer.isView(input) || input instanceof ArrayBuffer) {
    const bytes = input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (!bytes.length) throw new RangeError('Han Xin data must not be empty');
    return { units: [...bytes], inputType: 'bytes', encoding: 'binary' };
  }
  throw new TypeError('Han Xin data must be a string, Uint8Array, typed-array view, or ArrayBuffer');
}

const isDigit = (value) => value >= 0x30 && value <= 0x39;
const isUpper = (value) => value >= 0x41 && value <= 0x5a;
const isLower = (value) => value >= 0x61 && value <= 0x7a;
const textSubmode = (value) => isDigit(value) || isUpper(value) || isLower(value) ? 1 : 2;
const text1 = (value) => isDigit(value) ? value - 0x30 : isUpper(value) ? value - 0x41 + 10 : isLower(value) ? value - 0x61 + 36 : -1;
function text2(value) {
  if (value <= 27) return value;
  if (value >= 0x20 && value <= 0x2f) return value - 0x20 + 28;
  if (value >= 0x3a && value <= 0x40) return value - 0x3a + 44;
  if (value >= 0x5b && value <= 0x60) return value - 0x5b + 51;
  if (value >= 0x7b && value <= 0x7f) return value - 0x7b + 57;
  return -1;
}

const isRegion1 = (glyph) => {
  const first = glyph >>> 8;
  const second = glyph & 0xff;
  return ((first >= 0xb0 && first <= 0xd7) || (first >= 0xa1 && first <= 0xa3)) && second >= 0xa1 && second <= 0xfe ||
    glyph >= 0xa8a1 && glyph <= 0xa8c0;
};
const isRegion2 = (glyph) => {
  const first = glyph >>> 8;
  const second = glyph & 0xff;
  return first >= 0xd8 && first <= 0xf7 && second >= 0xa1 && second <= 0xfe;
};
const isDoubleByte = (glyph) => {
  const first = glyph >>> 8;
  const second = glyph & 0xff;
  return first >= 0x81 && first <= 0xfe && (second >= 0x40 && second <= 0x7e || second >= 0x80 && second <= 0xfe);
};
const isFourByte = (firstPair, secondPair) => {
  const a = firstPair >>> 8, b = firstPair & 0xff, c = secondPair >>> 8, d = secondPair & 0xff;
  return a >= 0x81 && a <= 0xfe && b >= 0x30 && b <= 0x39 && c >= 0x81 && c <= 0xfe && d >= 0x30 && d <= 0x39;
};

export function selectHanXinModes(units) {
  const traces = Array.from({ length: units.length }, () => Array(7).fill(null));
  let previous = [...HEAD_COSTS];
  let numericEnd = 0, numericCost = 0, fourByteEnd = 0, fourByteCost = 0, submode = 1;
  for (let position = 0; position < units.length; position++) {
    const costs = Array(7).fill(0);
    let supportsText1, supportsText2;
    if (position < numericEnd || isDigit(units[position])) {
      if (position >= numericEnd) {
        let end = position;
        while (end < units.length && end < position + 3 && isDigit(units[end])) end++;
        numericEnd = end;
        const count = end - position;
        numericCost = count === 1 ? 60 : count === 2 ? 30 : 20;
      }
      costs[0] = previous[0] + numericCost;
      traces[position][0] = 'n';
      supportsText1 = true;
      supportsText2 = false;
    } else {
      supportsText1 = text1(units[position]) >= 0;
      supportsText2 = text2(units[position]) >= 0;
    }
    if (supportsText1 || supportsText2) {
      const switches = submode === 1 && supportsText2 || submode === 2 && supportsText1;
      costs[1] = previous[1] + (switches ? 72 : 36);
      if (switches) submode = supportsText2 ? 2 : 1;
      traces[position][1] = 't';
    } else submode = 1;
    costs[2] = previous[2] + (units[position] > 0xff ? 96 : 48);
    traces[position][2] = 'b';
    if (position < fourByteEnd || position + 1 < units.length && isFourByte(units[position], units[position + 1])) {
      if (position >= fourByteEnd) {
        fourByteEnd = position + 2;
        fourByteCost = 75;
      }
      costs[6] = previous[6] + fourByteCost;
      traces[position][6] = 'f';
    } else if (isDoubleByte(units[position])) {
      costs[5] = previous[5] + 90;
      traces[position][5] = 'd';
      if (isRegion1(units[position])) { costs[3] = previous[3] + 72; traces[position][3] = '1'; }
      else if (isRegion2(units[position])) { costs[4] = previous[4] + 72; traces[position][4] = '2'; }
    }
    if (position === units.length - 1) {
      for (let mode = 0; mode < 7; mode++) if (traces[position][mode]) costs[mode] += END_COSTS[mode];
    }
    for (let to = 0; to < 7; to++) {
      for (let from = 0; from < 7; from++) {
        if (to !== from && traces[position][from]) {
          const candidate = costs[from] + SWITCH_COSTS[from][to];
          if (!traces[position][to] || candidate < costs[to]) {
            costs[to] = candidate;
            traces[position][to] = MODE_TYPES[from];
          }
        }
      }
    }
    previous = costs;
  }
  let mode = previous.indexOf(Math.min(...previous));
  const modes = Array(units.length);
  for (let position = units.length - 1; position >= 0; position--) {
    const prior = traces[position][mode];
    modes[position] = prior;
    mode = MODE_TYPES.indexOf(prior);
  }
  return modes;
}

class BitBuffer {
  constructor() { this.bits = []; }
  append(value, width) {
    for (let shift = width - 1; shift >= 0; shift--) this.bits.push(Boolean((value >>> shift) & 1));
  }
}

function createGs1Sequence(units) {
  const sequence = [];
  let byteStart = -1;
  for (let position = 0; position < units.length;) {
    let digitCount = 0;
    while (position + digitCount < units.length && isDigit(units[position + digitCount])) digitCount++;
    const numericThreshold = position + digitCount >= units.length ? 5 : 8;
    if (digitCount >= numericThreshold) {
      if (byteStart >= 0) {
        sequence.push({ mode: 'b', units: units.slice(byteStart, position) });
        byteStart = -1;
      }
      sequence.push({ mode: 'n', units: units.slice(position, position + digitCount) });
      position += digitCount;
    } else if (units[position] === 0x1d) {
      if (byteStart >= 0) {
        sequence.push({ mode: 'b', units: units.slice(byteStart, position) });
        byteStart = -1;
      }
      sequence.push({ mode: 'g', units: [0x1d] });
      position++;
    } else {
      if (byteStart < 0) byteStart = position;
      position++;
    }
  }
  if (byteStart >= 0) sequence.push({ mode: 'b', units: units.slice(byteStart) });
  return sequence;
}

function compactGs1HanXin(units, eci) {
  if (eci) throw new RangeError('Han Xin GS1 mode does not support an ECI header');
  if (units.some((unit) => unit > 0x7f)) throw new RangeError('Han Xin GS1 input must use the GS1 ASCII character set');
  if (units[0] === 0x1d || units.at(-1) === 0x1d || units.some((unit, index) => unit === 0x1d && units[index + 1] === 0x1d)) {
    throw new RangeError('Han Xin GS1 separators must occur between non-empty element strings');
  }
  const sequence = createGs1Sequence(units);
  const output = new BitBuffer();
  output.append(0xe1, 8); // GS1 framing prefix
  for (let index = 0; index < sequence.length; index++) {
    const segment = sequence[index];
    const previous = sequence[index - 1];
    const next = sequence[index + 1];
    if (segment.mode === 'b') {
      output.append(3, 4);
      output.append(segment.units.length, 13);
      for (const byte of segment.units) output.append(byte, 8);
    } else if (segment.mode === 'g') {
      const continuesFromNumeric = previous?.mode === 'n' && previous.units.length % 3 === 0;
      if (!continuesFromNumeric) output.append(1, 4);
      output.append(1000, 10); // FNC1 extension value in Numeric mode
      if (next?.mode !== 'n') output.append(1023, 10);
    } else {
      if (previous?.mode !== 'g') output.append(1, 4);
      let finalCount = 0;
      for (let position = 0; position < segment.units.length;) {
        finalCount = Math.min(3, segment.units.length - position);
        let value = 0;
        for (let offset = 0; offset < finalCount; offset++) value = value * 10 + segment.units[position + offset] - 0x30;
        output.append(value, 10);
        position += finalCount;
      }
      const continuesIntoSeparator = next?.mode === 'g' && segment.units.length % 3 === 0;
      if (!continuesIntoSeparator) output.append(1020 + finalCount, 10);
    }
  }
  output.append(0xff, 8); // GS1 framing suffix
  const modes = sequence.flatMap((segment) => Array(segment.units.length).fill(segment.mode));
  let offset = 0;
  const segments = sequence.map((segment) => {
    const result = { mode: segment.mode, start: offset, end: offset + segment.units.length, length: segment.units.length };
    offset = result.end;
    return result;
  });
  return { bits: output.bits, modes, segments };
}

function segmentsFromModes(modes) {
  const result = [];
  for (let start = 0; start < modes.length;) {
    let end = start + 1;
    while (end < modes.length && modes[end] === modes[start]) end++;
    result.push({ mode: modes[start], start, end, length: end - start });
    start = end;
  }
  return result;
}

export function compactHanXin(units, { eci = 0, gs1 = false } = {}) {
  if (!Number.isInteger(eci) || eci < 0 || eci > 999999) throw new RangeError('ECI must be an integer from 0 to 999999');
  if (gs1) return compactGs1HanXin(units, eci);
  const modes = selectHanXinModes(units);
  const segments = segmentsFromModes(modes);
  const output = new BitBuffer();
  if (eci) {
    output.append(8, 4);
    if (eci <= 127) output.append(eci, 8);
    else if (eci <= 16383) { output.append(2, 2); output.append(eci, 14); }
    else { output.append(6, 3); output.append(eci, 21); }
  }
  for (const segment of segments) {
    const { mode, start, end } = segment;
    if (mode === 'n') {
      output.append(1, 4);
      let finalCount = 0;
      for (let position = start; position < end;) {
        finalCount = Math.min(3, end - position);
        let value = 0;
        for (let i = 0; i < finalCount; i++) value = value * 10 + units[position + i] - 0x30;
        output.append(value, 10);
        position += finalCount;
      }
      output.append(1020 + finalCount, 10);
    } else if (mode === 't') {
      output.append(2, 4);
      let submode = 1;
      for (let position = start; position < end; position++) {
        const required = textSubmode(units[position]);
        if (required !== submode) { output.append(62, 6); submode = required; }
        output.append(submode === 1 ? text1(units[position]) : text2(units[position]), 6);
      }
      output.append(63, 6);
    } else if (mode === 'b') {
      output.append(3, 4);
      const byteCount = units.slice(start, end).reduce((count, unit) => count + (unit > 0xff ? 2 : 1), 0);
      if (byteCount > 8191) throw new RangeError('A Han Xin binary segment cannot exceed 8191 bytes');
      output.append(byteCount, 13);
      for (let position = start; position < end; position++) output.append(units[position], units[position] > 0xff ? 16 : 8);
    } else if (mode === '1' || mode === '2') {
      const previousMode = start ? modes[start - 1] : null;
      if (!(mode === '1' && previousMode === '2') && !(mode === '2' && previousMode === '1')) output.append(mode === '1' ? 4 : 5, 4);
      for (let position = start; position < end; position++) {
        const first = units[position] >>> 8, second = units[position] & 0xff;
        let glyph;
        if (mode === '1') {
          glyph = 0x5e * (first - 0xb0) + second - 0xa1;
          if (first >= 0xa1 && first <= 0xa3 && second >= 0xa1 && second <= 0xfe) glyph = 0x5e * (first - 0xa1) + second - 0xa1 + 0xeb0;
          if (units[position] >= 0xa8a1 && units[position] <= 0xa8c0) glyph = second - 0xa1 + 0xfca;
        } else glyph = 0x5e * (first - 0xd8) + second - 0xa1;
        output.append(glyph, 12);
      }
      const nextMode = end < modes.length ? modes[end] : null;
      output.append(nextMode === (mode === '1' ? '2' : '1') ? 4094 : 4095, 12);
    } else if (mode === 'd') {
      output.append(6, 4);
      for (let position = start; position < end; position++) {
        const first = units[position] >>> 8, second = units[position] & 0xff;
        output.append(0xbe * (first - 0x81) + second - (second <= 0x7e ? 0x40 : 0x41), 15);
      }
      output.append(32767, 15);
    } else {
      for (let position = start; position < end; position += 2) {
        output.append(7, 4);
        const first = units[position] >>> 8, second = units[position] & 0xff;
        const third = units[position + 1] >>> 8, fourth = units[position + 1] & 0xff;
        output.append(0x3138 * (first - 0x81) + 0x04ec * (second - 0x30) + 10 * (third - 0x81) + fourth - 0x30, 21);
      }
    }
  }
  return { bits: output.bits, modes, segments };
}
