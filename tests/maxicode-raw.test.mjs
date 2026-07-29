import assert from 'node:assert/strict';
import test from 'node:test';
import { MaxiCodeCore } from '../libs/MaxiCodeCore.js';
import { parseMaxiCodeRawInput } from '../libs/MaxiCodeRaw.js';

test('parses bcgen decimal escapes and named control aliases', () => {
  assert.equal(
    parseMaxiCodeRawInput('[)>~03001<GS>96~029840<RS><EOT>'),
    '[)>\x1e01\x1d96\x1d840\x1e\x04',
  );
});

test('uses a doubled tilde for a literal tilde', () => {
  assert.equal(parseMaxiCodeRawInput('A~~B'), 'A~B');
});

test('rejects decimal escapes outside the byte range', () => {
  assert.throws(() => parseMaxiCodeRawInput('~999'), /outside the byte range/);
});

test('mode 4 preserves raw CR, GS, RS and EOT controls', () => {
  const raw = parseMaxiCodeRawInput('A~013B~029C~030D~004');
  const result = new MaxiCodeCore(raw, { mode: 4, preserveControls: true }).generate();

  assert.equal(result.mode, 4);
  assert.equal(result.data, 'A\rB\x1dC\x1eD\x04');
  assert.equal(result.codewords.length, 144);
});

