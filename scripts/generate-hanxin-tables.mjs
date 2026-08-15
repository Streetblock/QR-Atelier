import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [hanxinHeader, gb18030Header, outputDirectory = 'libs'] = process.argv.slice(2);
if (!hanxinHeader || !gb18030Header) {
  throw new Error('Usage: node scripts/generate-hanxin-tables.mjs <hanxin.h> <gb18030.h> [output-directory]');
}

const [hanxin, gb18030] = await Promise.all([
  readFile(hanxinHeader, 'utf8'),
  readFile(gb18030Header, 'utf8'),
]);

function numbers(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*\\[[^;]+?=\\s*\\{([\\s\\S]*?)\\};`));
  if (!match) throw new Error(`Unable to locate ${name}`);
  return [...match[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/0x[\da-f]+|\d+/gi)]
    .map(({ 0: value }) => Number(value));
}

function rows(values, width) {
  const result = [];
  for (let offset = 0; offset < values.length; offset += width) {
    result.push(values.slice(offset, offset + width));
  }
  return result;
}

function formatArray(values, indent = '  ', width = 12) {
  return values.map((row) => `${indent}${row.join(', ')}`).join(',\n');
}

const total = numbers(hanxin, 'hx_total_codewords');
const data = rows(numbers(hanxin, 'hx_data_codewords'), 84);
const moduleK = numbers(hanxin, 'hx_module_k');
const moduleR = numbers(hanxin, 'hx_module_r');
const moduleM = numbers(hanxin, 'hx_module_m');
const d1 = rows(numbers(hanxin, 'hx_table_d1'), 9);

if (total.length !== 84 || data.length !== 4 || d1.length !== 84 * 4) {
  throw new Error('Unexpected Han Xin table dimensions');
}

const blocks = Array.from({ length: 84 }, (_, version) =>
  Array.from({ length: 4 }, (_, level) => {
    const row = d1[version * 4 + level];
    return rows(row, 3).filter(([count]) => count).map(([count, dataCodewords, eccCodewords]) => ({
      count,
      dataCodewords,
      eccCodewords,
    }));
  }));

const tableSource = `/* Generated from ISO/IEC 20830 tables as represented by Zint (BSD-3-Clause).
 * Regenerate with scripts/generate-hanxin-tables.mjs; do not edit manually. */

export const HAN_XIN_TOTAL_CODEWORDS = Object.freeze([
${formatArray(rows(total, 10))}
]);

export const HAN_XIN_DATA_CODEWORDS = Object.freeze([
${data.map((level) => `  Object.freeze([
${formatArray(rows(level, 10), '    ')}
  ])`).join(',\n')}
]);

export const HAN_XIN_MODULE_K = Object.freeze([
${formatArray(rows(moduleK, 14))}
]);
export const HAN_XIN_MODULE_R = Object.freeze([
${formatArray(rows(moduleR, 14))}
]);
export const HAN_XIN_MODULE_M = Object.freeze([
${formatArray(rows(moduleM, 14))}
]);

export const HAN_XIN_RS_BLOCKS = Object.freeze(${JSON.stringify(blocks, null, 2)});
`;

const unicode2 = numbers(gb18030, 'gb18030_2_u');
const multibyte2 = numbers(gb18030, 'gb18030_2_mb');
const unicode4Ends = numbers(gb18030, 'gb18030_4_u_e');
const multibyte4Offsets = numbers(gb18030, 'gb18030_4_mb_o');

// WHATWG-compatible decoders expose the complete GBK subset. Reversing its
// legal two-byte space produces a compact, deterministic Unicode lookup.
const decoder = new TextDecoder('gb18030', { fatal: true });
const map = new Map();
for (let lead = 0x81; lead <= 0xfe; lead++) {
  for (let trail = 0x40; trail <= 0xfe; trail++) {
    if (trail === 0x7f) continue;
    try {
      const decoded = decoder.decode(Uint8Array.of(lead, trail));
      const points = [...decoded];
      if (points.length === 1 && points[0].codePointAt(0) >= 0x80) {
        map.set(points[0].codePointAt(0), (lead << 8) | trail);
      }
    } catch {
      // Invalid byte pair.
    }
  }
}
for (let i = 0; i < unicode2.length; i++) map.set(unicode2[i], multibyte2[i]);

const pairs = [...map].sort((a, b) => a[0] - b[0]);
const gbSource = `/* Generated Unicode to GB 18030-2005 support data.
 * Two-byte mappings are reversed from the platform's WHATWG GB18030 decoder;
 * four-byte ranges come from the public GB18030 mapping represented by Zint. */

export const GB18030_TWO_BYTE = Object.freeze([
${formatArray(rows(pairs.flat(), 12))}
]);
export const GB18030_FOUR_BYTE_ENDS = Object.freeze([
${formatArray(rows(unicode4Ends, 12))}
]);
export const GB18030_FOUR_BYTE_OFFSETS = Object.freeze([
${formatArray(rows(multibyte4Offsets, 12))}
]);
`;

await Promise.all([
  writeFile(resolve(outputDirectory, 'HanXinTables.js'), tableSource),
  writeFile(resolve(outputDirectory, 'gb18030Map.js'), gbSource),
]);

console.log(`Generated Han Xin tables and ${pairs.length} GB18030 two-byte mappings.`);
