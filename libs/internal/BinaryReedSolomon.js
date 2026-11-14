// Internal binary-field RS arithmetic. Format framing, block interleaving,
// symbol sizing, and prime-field PDF417 error correction stay with callers.

const preset = (name, fieldSize, primitive, generatorBase) => Object.freeze({ name, fieldSize, primitive, generatorBase });
const qr = preset('QR_256', 256, 0x11d, 0);
const aztec4 = preset('AZTEC_4', 16, 0x13, 1);
const aztec6 = preset('AZTEC_6', 64, 0x43, 1);
const aztec8 = preset('AZTEC_8', 256, 0x12d, 1);
const aztec10 = preset('AZTEC_10', 1024, 0x409, 1);
const aztec12 = preset('AZTEC_12', 4096, 0x1069, 1);

export const BINARY_RS_FIELDS = Object.freeze({
  QR_256: qr, AZTEC_4: aztec4, AZTEC_6: aztec6, AZTEC_8: aztec8,
  AZTEC_10: aztec10, AZTEC_12: aztec12,
  DATA_MATRIX: aztec8, MAXICODE: aztec6,
});

const allowedPresets = new Set(Object.values(BINARY_RS_FIELDS));
const MAX_GENERATORS_PER_FIELD = 8;
const MAX_GENERATOR_WORDS_PER_FIELD = 8192;
// Only the six fixed presets can create state. Tables and generators are lazy;
// cached arrays are private and are never returned to a caller.
const fieldStates = new Map();

function fieldState(field) {
  let state = fieldStates.get(field);
  if (state) return state;
  const period = field.fieldSize - 1;
  const exponents = new Uint16Array(period * 2);
  const logarithms = new Uint16Array(field.fieldSize);
  let value = 1;
  for (let exponent = 0; exponent < period; exponent++) {
    exponents[exponent] = value;
    logarithms[value] = exponent;
    value <<= 1;
    if (value >= field.fieldSize) value ^= field.primitive;
  }
  exponents.set(exponents.subarray(0, period), period);
  state = { exponents, logarithms, generators: new Map(), cachedWords: 0 };
  fieldStates.set(field, state);
  return state;
}

function multiply(left, right, state) {
  if (left === 0 || right === 0) return 0;
  return state.exponents[state.logarithms[left] + state.logarithms[right]];
}

function generator(degree, field, state) {
  const cached = state.generators.get(degree);
  if (cached) {
    state.generators.delete(degree);
    state.generators.set(degree, cached);
    return cached;
  }

  // Highest-power-first coefficients, excluding the monic leading 1.
  // Build exactly this degree in one fixed-size array. No prefix-polynomial
  // chain is kept, including for large 10/12-bit Aztec check-word counts.
  const coefficients = new Uint16Array(degree);
  coefficients[degree - 1] = 1;
  let root = state.exponents[field.generatorBase];
  for (let factor = 0; factor < degree; factor++) {
    for (let index = 0; index < degree; index++) {
      coefficients[index] = multiply(coefficients[index], root, state)
        ^ (index + 1 < degree ? coefficients[index + 1] : 0);
    }
    root = multiply(root, 2, state);
  }

  while (state.generators.size >= MAX_GENERATORS_PER_FIELD
    || state.cachedWords + degree > MAX_GENERATOR_WORDS_PER_FIELD) {
    const oldestDegree = state.generators.keys().next().value;
    state.generators.delete(oldestDegree);
    state.cachedWords -= oldestDegree;
  }
  state.generators.set(degree, coefficients);
  state.cachedWords += degree;
  return coefficients;
}

/**
 * Return a new highest-power-first parity array without changing dataWords.
 * field must be one of the fixed frozen BINARY_RS_FIELDS identities.
 * Numeric arrays and typed arrays are accepted; every word is validated and
 * snapshotted before any field cache is initialized or parity is calculated.
 */
export function encodeBinaryReedSolomon(dataWords, checkWordCount, field) {
  if (!allowedPresets.has(field)) throw new TypeError('Binary RS requires a supported field preset.');
  if (!Number.isInteger(checkWordCount) || checkWordCount < 1 || checkWordCount >= field.fieldSize) {
    throw new RangeError('Binary RS check-word count is outside the selected field.');
  }
  if (!Array.isArray(dataWords) && !(ArrayBuffer.isView(dataWords) && !(dataWords instanceof DataView))) {
    throw new TypeError('Binary RS data must be a numeric array or typed array.');
  }
  if (!Number.isSafeInteger(dataWords.length) || dataWords.length < 1) throw new RangeError('Binary RS data must not be empty.');
  const input = new Array(dataWords.length);
  for (let index = 0; index < input.length; index++) {
    const word = dataWords[index];
    if (!Number.isInteger(word) || word < 0 || word >= field.fieldSize) {
      throw new RangeError('Binary RS data contains a word outside the selected field.');
    }
    input[index] = word;
  }

  const state = fieldState(field);
  const coefficients = generator(checkWordCount, field, state);
  const remainder = new Uint16Array(checkWordCount);
  for (const word of input) {
    const leading = word ^ remainder[0];
    for (let index = 0; index < checkWordCount - 1; index++) {
      remainder[index] = remainder[index + 1] ^ multiply(coefficients[index], leading, state);
    }
    remainder[checkWordCount - 1] = multiply(coefficients[checkWordCount - 1], leading, state);
  }
  return Array.from(remainder);
}
