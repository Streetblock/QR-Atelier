import { HAN_XIN_RS_BLOCKS, HAN_XIN_TOTAL_CODEWORDS } from './HanXinTables.js';

function createField(primitive) {
  const degree = Math.floor(Math.log2(primitive));
  const size = 1 << degree;
  const log = new Uint16Array(size);
  const exp = new Uint16Array((size - 1) * 2);
  let value = 1;
  for (let i = 0; i < size - 1; i++) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & size) value ^= primitive;
  }
  for (let i = size - 1; i < exp.length; i++) exp[i] = exp[i - (size - 1)];
  return { size, log, exp };
}

const GF256 = createField(0x163);
const GF16 = createField(0x13);

export function reedSolomon(data, parityCount, { primitive = 0x163, generatorBase = 1 } = {}) {
  const field = primitive === 0x163 ? GF256 : primitive === 0x13 ? GF16 : createField(primitive);
  const polynomial = new Uint16Array(parityCount + 1);
  polynomial[0] = 1;
  let index = generatorBase;
  for (let i = 1; i <= parityCount; i++, index++) {
    polynomial[i] = 1;
    for (let k = i - 1; k > 0; k--) {
      if (polynomial[k]) polynomial[k] = field.exp[field.log[polynomial[k]] + index];
      polynomial[k] ^= polynomial[k - 1];
    }
    polynomial[0] = field.exp[field.log[polynomial[0]] + index];
  }
  const result = new Uint16Array(parityCount);
  for (const item of data) {
    const multiplier = result[parityCount - 1] ^ item;
    if (multiplier) {
      const logMultiplier = field.log[multiplier];
      for (let k = parityCount - 1; k > 0; k--) {
        result[k] = result[k - 1] ^ (polynomial[k] ? field.exp[logMultiplier + field.log[polynomial[k]]] : 0);
      }
      result[0] = field.exp[logMultiplier + field.log[polynomial[0]]];
    } else {
      for (let k = parityCount - 1; k > 0; k--) result[k] = result[k - 1];
      result[0] = 0;
    }
  }
  return [...result].reverse();
}

export function addHanXinErrorCorrection(dataCodewords, version, level) {
  const definitions = HAN_XIN_RS_BLOCKS[version - 1]?.[level - 1];
  if (!definitions) throw new RangeError('Invalid Han Xin version or error-correction level');
  const full = [];
  const blocks = [];
  let inputPosition = 0;
  for (const definition of definitions) {
    for (let blockIndex = 0; blockIndex < definition.count; blockIndex++) {
      const data = Array.from({ length: definition.dataCodewords }, () => dataCodewords[inputPosition++] ?? 0);
      const ecc = reedSolomon(data, definition.eccCodewords);
      full.push(...data, ...ecc);
      blocks.push({ data, ecc });
    }
  }
  if (full.length !== HAN_XIN_TOTAL_CODEWORDS[version - 1]) throw new Error('Internal Han Xin RS table mismatch');
  return { full, blocks };
}

export function createHanXinFunctionBits(version, level, mask) {
  const data = [
    (version + 20) >>> 4,
    version + 20 & 0x0f,
    ((level - 1) << 2) | mask,
  ];
  const ecc = reedSolomon(data, 4, { primitive: 0x13 });
  const bits = [];
  for (const nibble of [...data, ...ecc]) {
    for (let shift = 3; shift >= 0; shift--) bits.push(Boolean((nibble >>> shift) & 1));
  }
  while (bits.length < 34) bits.push(false);
  return bits;
}
