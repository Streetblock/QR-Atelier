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

test('optional mask selection evaluates eight complete candidates and only scores the ranked finalists', () => {
  const options = { minVersion: 7, maxVersion: 7, errorCorrectionLevel: 'Q', includeMaskMetadata: true };
  const matrices = Array.from({ length: 8 }, (_, mask) => new QrCore('T8', { ...options, mask }).generate().modules);
  const preliminary = [4, 9, 4, 2, 8, 8, 1, 5];
  const scored = [];
  let calls = 0;
  const result = new QrCore('T8', { ...options, maskSelection: {
    finalistCount: 3,
    preliminaryScore(candidate) {
      assert.deepEqual(candidate, matrices[calls]);
      return preliminary[calls++];
    },
    finalScore(candidate, score) {
      const mask = [6, 3, 0][scored.length];
      assert.deepEqual(candidate, matrices[mask]);
      assert.equal(score, preliminary[mask]);
      scored.push(mask);
      return mask === 3 ? 10 : 0;
    },
  } }).generate();
  assert.equal(calls, 8);
  assert.deepEqual(scored, [6, 3, 0]);
  assert.equal(result.mask, 6);
  assert.deepEqual(result.modules, matrices[6]);
});

test('two-stage selection bypasses explicit masks and validates its contract', () => {
  const fail = () => { throw new Error('Explicit masks must bypass both scorers.'); };
  const selector = { finalistCount: 3, preliminaryScore: () => 0, finalScore: () => 0 };
  for (let mask = 0; mask < 8; mask += 1) {
    const baseline = new QrCore('ABC', { mask }).generate();
    const result = new QrCore('ABC', { mask, maskSelection: {
      finalistCount: 3, preliminaryScore: fail, finalScore: fail,
    } }).generate();
    assert.deepEqual(result, baseline);
  }
  for (const maskSelection of [null, { ...selector, finalistCount: 0 }, { ...selector, finalistCount: 9 },
    { ...selector, preliminaryScore: 42 }, { ...selector, finalScore: 42 }]) {
    assert.throws(() => new QrCore('ABC', { maskSelection }).generate(), TypeError);
  }
  for (const score of [NaN, Infinity, -1]) {
    for (const stage of ['preliminaryScore', 'finalScore']) {
      const maskSelection = { ...selector, [stage]: () => score };
      assert.throws(() => new QrCore('ABC', { maskSelection }).generate(), RangeError);
    }
  }
});
