import test from 'node:test';
import assert from 'node:assert/strict';
import { QrCore } from '../libs/QRcore.js';

test('mask metadata and custom scoring are explicit options; default results keep their contract', () => {
  const options = { minVersion: 2, maxVersion: 2, errorCorrectionLevel: 'Q', eci: false };
  const original = new QrCore('T8', options).generate();
  assert.equal(Object.hasOwn(original, 'mask'), false);
  let calls = 0;
  const result = new QrCore('T8', { ...options, includeMaskMetadata: true,
    maskPenaltyEvaluator: candidate => { calls++; assert.ok(candidate.flat().every(value => typeof value === 'boolean')); return 0; } }).generate();
  assert.equal(calls, 8); assert.equal(result.mask, 0);
  assert.deepEqual(result.modules, new QrCore('T8', { ...options, mask: 0 }).generate().modules);
});

test('legacy remainder scoring preserves nullable cells while final matrices stay boolean', () => {
  let sawNull = false;
  const options = { minVersion: 2, maxVersion: 2, eci: false, includeMaskMetadata: true,
    maskScoringRemainder: 'legacy-null', maskPenaltyEvaluator: candidate => {
      sawNull ||= candidate.flat().includes(null); return 0;
    } };
  const result = new QrCore('T8', options).generate();
  assert.ok(sawNull); assert.equal(result.mask, 0);
  assert.ok(result.modules.flat().every(value => typeof value === 'boolean'));
  assert.deepEqual(result.modules, new QrCore('T8', { ...options, mask: 0 }).generate().modules);
});

test('an explicit mask bypasses the scorer, and invalid scoring contracts fail closed', () => {
  const result = new QrCore('ABC', { mask: 7, includeMaskMetadata: true,
    maskPenaltyEvaluator: () => { throw new Error('Must not evaluate an explicit mask.'); } }).generate();
  assert.equal(result.mask, 7);
  for (const options of [{ maskPenaltyEvaluator: 42 }, { maskScoringRemainder: 'unknown' },
    { includeMaskMetadata: 'yes' }, ...[NaN, Infinity, -1].map(value => ({ maskPenaltyEvaluator: () => value }))]) {
    assert.throws(() => new QrCore('ABC', options).generate());
  }
});
