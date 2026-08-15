import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { HanXinCore } from '../libs/HanXinCore.js';

test('matches an installed Zint CLI for the Annex K vector', { skip: !process.env.ZINT_BIN && 'Set ZINT_BIN to a Zint executable' }, () => {
  const result = spawnSync(process.env.ZINT_BIN, [
    '--barcode=HANXIN', '--secure=1', '--vers=1', '--mask=1', '--dump', '--data=1234567890',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 23);
  const reference = lines.map((line) => [...line.replaceAll(' ', '')]
    .flatMap((hex) => Number.parseInt(hex, 16).toString(2).padStart(4, '0').split(''))
    .slice(0, 23).map((bit) => bit === '1'));
  const actual = new HanXinCore('1234567890', { version: 1, errorCorrection: 'L1', mask: 0 }).generate();
  assert.deepEqual(actual.modules, reference);
});
