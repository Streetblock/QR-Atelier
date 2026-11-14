// Test/reference implementation only. No logarithm tables, caches, or copied
// production RS code. Polynomial coefficients are highest-degree first.
export const FIELD_PRESETS = Object.freeze({
  QR: Object.freeze({ fieldSize: 256, primitive: 0x11d, generatorBase: 0 }),
  AZTEC_PARAM: Object.freeze({ fieldSize: 16, primitive: 0x13, generatorBase: 1 }),
  AZTEC_6_MAXICODE: Object.freeze({ fieldSize: 64, primitive: 0x43, generatorBase: 1 }),
  DM_AZTEC_8: Object.freeze({ fieldSize: 256, primitive: 0x12d, generatorBase: 1 }),
  AZTEC_10: Object.freeze({ fieldSize: 1024, primitive: 0x409, generatorBase: 1 }),
  AZTEC_12: Object.freeze({ fieldSize: 4096, primitive: 0x1069, generatorBase: 1 }),
});

export function carrylessMultiply(left, right, field) {
  let a = left, b = right, value = 0;
  while (b !== 0) {
    if (b & 1) value ^= a;
    b >>>= 1;
    a <<= 1;
    if (a & field.fieldSize) a ^= field.primitive;
  }
  return value;
}

export function polynomialParity(data, checkWordCount, field) {
  if (!Number.isInteger(checkWordCount) || checkWordCount < 1 || checkWordCount >= field.fieldSize) throw new RangeError('Invalid parity degree.');
  if (!Array.isArray(data) || data.length === 0 || data.some(word => !Number.isInteger(word) || word < 0 || word >= field.fieldSize)) throw new RangeError('Invalid field word.');
  let root = 1;
  for (let power = 0; power < field.generatorBase; power++) root = carrylessMultiply(root, 2, field);
  let divisor = [1];
  for (let factor = 0; factor < checkWordCount; factor++) {
    const next = new Array(divisor.length + 1).fill(0);
    for (let position = 0; position < divisor.length; position++) {
      next[position] ^= divisor[position];
      next[position + 1] ^= carrylessMultiply(divisor[position], root, field);
    }
    divisor = next;
    root = carrylessMultiply(root, 2, field);
  }
  const divided = [...data, ...new Array(checkWordCount).fill(0)];
  for (let position = 0; position < data.length; position++) {
    const leading = divided[position];
    for (let coefficient = 0; coefficient < divisor.length; coefficient++) {
      divided[position + coefficient] ^= carrylessMultiply(divisor[coefficient], leading, field);
    }
  }
  return divided.slice(data.length);
}

export function deterministicParityVectors() {
  const vectors = [];
  for (const [preset, field] of Object.entries(FIELD_PRESETS)) {
    const degrees = [...new Set([1, 2, 5, Math.min(30, field.fieldSize - 2)])];
    for (const degree of degrees) {
      const count = Math.min(19, field.fieldSize - 1 - degree);
      const patterns = [
        ['zeros', new Array(count).fill(0)],
        ['leading-zero', Array.from({ length: count }, (_, index) => index < Math.min(3, count - 1) ? 0 : 1)],
        ['maximum', new Array(count).fill(field.fieldSize - 1)],
        ['mixed', Array.from({ length: count }, (_, index) => (index * 157 + count * 31) % field.fieldSize)],
      ];
      for (const [pattern, data] of patterns) vectors.push({
        id: `${preset}-r${degree}-${pattern}`, preset, field, data, checkWordCount: degree,
        parity: polynomialParity(data, degree, field),
      });
    }
  }
  return vectors;
}
