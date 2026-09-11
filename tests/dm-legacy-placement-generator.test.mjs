// SPDX-FileCopyrightText: 2026 David Block
// SPDX-License-Identifier: MIT OR Apache-2.0

import test from 'node:test';
import { readFileSync } from 'node:fs';
const packedTables = JSON.parse(readFileSync(new URL('./fixtures/legacy-placement/packed-tables.json', import.meta.url), 'utf8'));
function referencePlacement(dataSide) {
  const bytes = Buffer.from(packedTables[dataSide], 'base64');
  return Array.from({ length: bytes.length / 2 }, (_, index) => bytes.readUInt16LE(index * 2));
}
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generatePlacement } from '../libs/DMlegacyPlacementGenerator.js';
import { getLegacyPlacement } from '../libs/DMlegacy.js';
// Fixed hashes of all cells independently extracted from FCD and GOST PDFs.
// See docs/legacy-placement-audit.md; these are not generated during testing.
const pdfHashes = {
  "23": "c901cdb6ad3215c4753b665d59a2fef23c850223a67ec484f6c2895d6cdd7e46",
  "25": "180a3619b80904ed56842ad6c9b2c66dd34a218eda002455bbb083a95d623e7a",
  "27": "1f76d0c5822daf725a4352b21633bef21ba956b0fffe1ed347ca71cafb789e4f"
};
for (let symbolSide = 9; symbolSide <= 49; symbolSide += 2) {
  test('Legacy placement control generator, symbol ' + symbolSide, () => {
    const actual = generatePlacement(symbolSide);
    const reference = referencePlacement(symbolSide - 2);
    assert.deepEqual(actual, reference, 'Full fixed table reference');
    const publicCopy = getLegacyPlacement(symbolSide - 2);
    publicCopy.fill(-1);
    assert.deepEqual(getLegacyPlacement(symbolSide - 2), reference, 'Cached table is protected from caller mutations');
    assert.deepEqual([...actual].sort((a,b) => a-b), Array.from({length:actual.length}, (_,i)=>i));
    assert.deepEqual(actual, Array.from(getLegacyPlacement(symbolSide-2)));
    const expectedHash = pdfHashes[symbolSide-2];
    if(expectedHash) assert.equal(createHash('sha256').update(actual.join(',')).digest('hex'), expectedHash);
    actual[0] = -1;
    assert.equal(generatePlacement(symbolSide)[0], 2);
  });
}
test('Legacy placement generator rejects unsupported sizes', () => {
  for(const invalid of [0,7,8,10,50,51,9.5,NaN,Infinity,'31',null]) {
    assert.throws(()=>generatePlacement(invalid), RangeError);
  }
});
