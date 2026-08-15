import { compactHanXin, normalizeHanXinInput } from './HanXinCompaction.js';
import { addHanXinErrorCorrection } from './HanXinErrorCorrection.js';
import { createHanXinGrid, populateAndMaskHanXin } from './HanXinMatrix.js';
import { HAN_XIN_DATA_CODEWORDS, HAN_XIN_TOTAL_CODEWORDS } from './HanXinTables.js';

const LEVEL_NAMES = Object.freeze(['L1', 'L2', 'L3', 'L4']);

function parseLevel(value) {
  if (value == null) return 2;
  if (Number.isInteger(value) && value >= 1 && value <= 4) return value;
  const normalized = String(value).toUpperCase();
  const index = LEVEL_NAMES.indexOf(normalized);
  if (index >= 0) return index + 1;
  throw new RangeError('Han Xin errorCorrection must be L1, L2, L3, L4, or an integer from 1 to 4');
}

function parseVersion(value) {
  if (value == null || value === 'auto') return null;
  if (!Number.isInteger(value) || value < 1 || value > 84) throw new RangeError('Han Xin version must be an integer from 1 to 84');
  return value;
}

function parseMask(value) {
  if (value == null || value === 'auto') return null;
  if (!Number.isInteger(value) || value < 0 || value > 3) throw new RangeError('Han Xin mask must be auto or an integer from 0 to 3');
  return value;
}

export class HanXinCore {
  constructor(data, options = {}) {
    this.data = data;
    this.options = { ...options };
  }

  generate() {
    const level = parseLevel(this.options.errorCorrection ?? this.options.eccLevel);
    const forcedVersion = parseVersion(this.options.version);
    const requestedMask = parseMask(this.options.mask);
    const normalized = normalizeHanXinInput(this.data);
    const compacted = compactHanXin(normalized.units, { eci: this.options.eci ?? 0 });
    const requiredCodewords = Math.ceil(compacted.bits.length / 8);
    let version = forcedVersion;
    if (version == null) {
      version = HAN_XIN_DATA_CODEWORDS[level - 1].findIndex((capacity) => capacity >= requiredCodewords) + 1;
      if (!version) throw new RangeError(`Han Xin data exceeds the L${level} capacity of version 84`);
    } else if (requiredCodewords > HAN_XIN_DATA_CODEWORDS[level - 1][version - 1]) {
      throw new RangeError(`Han Xin data requires ${requiredCodewords} codewords but version ${version} L${level} holds ${HAN_XIN_DATA_CODEWORDS[level - 1][version - 1]}`);
    }
    const dataCapacity = HAN_XIN_DATA_CODEWORDS[level - 1][version - 1];
    const dataCodewords = Array(dataCapacity).fill(0);
    for (let bit = 0; bit < compacted.bits.length; bit++) if (compacted.bits[bit]) dataCodewords[bit >>> 3] |= 0x80 >>> (bit & 7);
    const { full: codewords, blocks } = addHanXinErrorCorrection(dataCodewords, version, level);
    const grid = createHanXinGrid(version);
    const rendered = populateAndMaskHanXin(grid, version, level, codewords, requestedMask);
    const size = version * 2 + 21;
    return {
      modules: rendered.modules,
      size,
      rows: size,
      columns: size,
      version,
      errorCorrection: LEVEL_NAMES[level - 1],
      errorCorrectionLevel: level,
      mask: rendered.mask,
      maskPenalties: rendered.penalties,
      inputType: normalized.inputType,
      encoding: normalized.encoding,
      eci: this.options.eci ?? 0,
      bitLength: compacted.bits.length,
      dataCodewords,
      errorCodewords: blocks.flatMap((block) => block.ecc),
      codewords,
      blocks,
      modes: compacted.modes,
      segments: compacted.segments.map((segment) => ({ ...segment, name: {
        n: 'numeric', t: 'text', b: 'binary', 1: 'region-one', 2: 'region-two', d: 'double-byte', f: 'four-byte',
      }[segment.mode] })),
      capacity: {
        dataCodewords: dataCapacity,
        totalCodewords: HAN_XIN_TOTAL_CODEWORDS[version - 1],
        remainingBits: dataCapacity * 8 - compacted.bits.length,
      },
    };
  }
}

export const HanxinCore = HanXinCore;

export default HanXinCore;
