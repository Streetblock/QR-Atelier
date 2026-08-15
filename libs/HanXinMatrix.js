import { HAN_XIN_MODULE_K, HAN_XIN_MODULE_M, HAN_XIN_MODULE_R } from './HanXinTables.js';
import { createHanXinFunctionBits } from './HanXinErrorCorrection.js';

const RESERVED_DARK = 0x11;
const RESERVED_LIGHT = 0x10;

function plotFinder(grid, size, x, y, rows) {
  for (let row = 0; row < 7; row++) for (let column = 0; column < 7; column++) {
    grid[(y + row) * size + x + column] = rows[row] & (0x40 >>> column) ? RESERVED_DARK : RESERVED_LIGHT;
  }
}
function safePlot(grid, size, x, y, value) {
  if (x >= 0 && x < size && y >= 0 && y < size && grid[y * size + x] === 0) grid[y * size + x] = value;
}
function plotAlignment(grid, size, x, y, width, height) {
  safePlot(grid, size, x, y, RESERVED_DARK);
  safePlot(grid, size, x - 1, y + 1, RESERVED_LIGHT);
  for (let i = 1; i <= width; i++) {
    safePlot(grid, size, x - i, y, RESERVED_DARK);
    safePlot(grid, size, x - i - 1, y + 1, RESERVED_LIGHT);
  }
  for (let i = 1; i < height; i++) {
    safePlot(grid, size, x, y + i, RESERVED_DARK);
    safePlot(grid, size, x - 1, y + i + 1, RESERVED_LIGHT);
  }
}
function plotAssistant(grid, size, x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    safePlot(grid, size, x + dx, y + dy, dx === 0 && dy === 0 ? RESERVED_DARK : RESERVED_LIGHT);
  }
}

export function createHanXinGrid(version) {
  const size = version * 2 + 21;
  const grid = new Uint8Array(size * size);
  plotFinder(grid, size, 0, 0, [0x7f, 0x40, 0x5f, 0x50, 0x57, 0x57, 0x57]);
  plotFinder(grid, size, size - 7, 0, [0x7f, 0x01, 0x7d, 0x05, 0x75, 0x75, 0x75]);
  plotFinder(grid, size, 0, size - 7, [0x7f, 0x01, 0x7d, 0x05, 0x75, 0x75, 0x75]);
  plotFinder(grid, size, size - 7, size - 7, [0x75, 0x75, 0x75, 0x05, 0x7d, 0x01, 0x7f]);
  for (let i = 0; i < 8; i++) {
    grid[7 * size + i] = grid[i * size + 7] = RESERVED_LIGHT;
    grid[7 * size + size - i - 1] = grid[(size - i - 1) * size + 7] = RESERVED_LIGHT;
    grid[i * size + size - 8] = grid[(size - 8) * size + i] = RESERVED_LIGHT;
    grid[(size - 8) * size + size - i - 1] = grid[(size - i - 1) * size + size - 8] = RESERVED_LIGHT;
  }
  for (let i = 0; i < 9; i++) {
    grid[8 * size + i] = grid[i * size + 8] = RESERVED_LIGHT;
    grid[8 * size + size - i - 1] = grid[(size - i - 1) * size + 8] = RESERVED_LIGHT;
    grid[i * size + size - 9] = grid[(size - 9) * size + i] = RESERVED_LIGHT;
    grid[(size - 9) * size + size - i - 1] = grid[(size - i - 1) * size + size - 9] = RESERVED_LIGHT;
  }
  if (version <= 3) return grid;
  const k = HAN_XIN_MODULE_K[version - 1], r = HAN_XIN_MODULE_R[version - 1], m = HAN_XIN_MODULE_M[version - 1];
  let y = 0, moduleY = 0;
  do {
    const height = moduleY < m ? k : r - 1;
    if (moduleY % 2 === 0) { if (m % 2 === 1) plotAssistant(grid, size, 0, y); }
    else { if (m % 2 === 0) plotAssistant(grid, size, 0, y); plotAssistant(grid, size, size - 1, y); }
    moduleY++; y += height;
  } while (y < size);
  let x = size - 1, moduleX = 0;
  do {
    const width = moduleX < m ? k : r - 1;
    if (moduleX % 2 === 0) { if (m % 2 === 1) plotAssistant(grid, size, x, size - 1); }
    else { if (m % 2 === 0) plotAssistant(grid, size, x, size - 1); plotAssistant(grid, size, x, 0); }
    moduleX++; x -= width;
  } while (x >= 0);
  let columnSwitch = true;
  y = 0; moduleY = 0;
  do {
    const height = moduleY < m ? k : r - 1;
    let rowSwitch = columnSwitch;
    columnSwitch = !columnSwitch;
    x = size - 1; moduleX = 0;
    do {
      const width = moduleX < m ? k : r - 1;
      if (rowSwitch && !(y === 0 && x === size - 1)) plotAlignment(grid, size, x, y, width, height);
      rowSwitch = !rowSwitch;
      moduleX++; x -= width;
    } while (x >= 0);
    moduleY++; y += height;
  } while (y < size);
  return grid;
}

export function setHanXinFunctionInfo(grid, size, version, level, mask) {
  const bits = createHanXinFunctionBits(version, level, mask);
  for (let i = 0; i < 9; i++) {
    if (bits[i]) { grid[8 * size + i] |= 1; grid[(size - 9) * size + size - i - 1] |= 1; }
    if (bits[i + 8]) { grid[(8 - i) * size + 8] |= 1; grid[(size - 9 + i) * size + size - 9] |= 1; }
    if (bits[i + 17]) { grid[i * size + size - 9] |= 1; grid[(size - 1 - i) * size + 8] |= 1; }
    if (bits[i + 25]) { grid[8 * size + size - 9 + i] |= 1; grid[(size - 9) * size + 8 - i] |= 1; }
  }
}

function evaluate(modules, size) {
  let penalty = 0;
  const scanPattern = (get) => {
    for (let start = 0; start <= size - 7; start++) {
      const pattern = Array.from({ length: 7 }, (_, i) => get(start + i));
      const match = pattern.join('') === '1010111' || pattern.join('') === '1110101';
      if (match) {
        const before = start < 3 || [1, 2, 3].every((offset) => !get(start - offset));
        const after = start + 10 > size || [7, 8, 9].every((offset) => !get(start + offset));
        if (before || after) penalty += 50;
        start++;
      }
    }
    let state = false, run = 0;
    for (let position = 0; position < size; position++) {
      const value = get(position);
      if (value === state) run++;
      else { if (run >= 3) penalty += run * 4; state = value; run = 1; }
    }
    if (run >= 3) penalty += run * 4;
  };
  for (let x = 0; x < size; x++) scanPattern((y) => y >= 0 && y < size ? Boolean(modules[y * size + x] & 1) : false);
  for (let y = 0; y < size; y++) scanPattern((x) => x >= 0 && x < size ? Boolean(modules[y * size + x] & 1) : false);
  return penalty;
}

function maskApplies(mask, x, y) {
  const i = y + 1, j = x + 1;
  if (mask === 1) return (i + j) % 2 === 0;
  if (mask === 2) return ((i + j) % 3 + j % 3) % 2 === 0;
  if (mask === 3) return (i % j + j % i + i % 3 + j % 3) % 2 === 0;
  return false;
}

function maskedGrid(source, size, version, level, mask) {
  const result = Uint8Array.from(source, (value) => value & 0x0f);
  if (mask) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = y * size + x;
    if (!(source[index] & 0xf0) && maskApplies(mask, x, y)) result[index] ^= 1;
  }
  setHanXinFunctionInfo(result, size, version, level, mask);
  return result;
}

export function populateAndMaskHanXin(grid, version, level, codewords, requestedMask = null) {
  const size = version * 2 + 21;
  const picketFence = [];
  for (let start = 0; start < 13; start++) for (let i = start; i < codewords.length; i += 13) picketFence.push(codewords[i]);
  let bit = 0;
  for (let index = 0; index < grid.length && bit < picketFence.length * 8; index++) if (grid[index] === 0) {
    if (picketFence[bit >>> 3] & (0x80 >>> (bit & 7))) grid[index] = 1;
    bit++;
  }
  const penalties = [];
  const masks = requestedMask == null ? [0, 1, 2, 3] : [requestedMask];
  let bestMask = masks[0], bestGrid, bestPenalty = Infinity;
  for (const mask of masks) {
    const candidate = maskedGrid(grid, size, version, level, mask);
    const penalty = evaluate(candidate, size);
    penalties[mask] = penalty;
    if (penalty < bestPenalty) { bestPenalty = penalty; bestMask = mask; bestGrid = candidate; }
  }
  return {
    mask: bestMask,
    penalties,
    modules: Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => Boolean(bestGrid[y * size + x] & 1))),
  };
}
