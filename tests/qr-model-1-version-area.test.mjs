import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { QrCore } from '../libs/QRcore.js';
import { digestResult, sha256 } from './helpers/encoder-corpus.mjs';

const original = JSON.parse(await readFile(new URL('./fixtures/encoder-baseline-372f456.json', import.meta.url), 'utf8'));
const correctionBytes = await readFile(new URL('./fixtures/qr-model1-version-area-corrections.json', import.meta.url));
const correction = JSON.parse(correctionBytes.toString('utf8'));

test('the version-area correction is restricted to all 32 saved Model 1 version 7–14 cases', () => {
  assert.equal(sha256(correctionBytes.toString('utf8').replaceAll('\r\n', '\n')), 'ea8c63588a973f0bb87d63142f0f6b732c135cef9741f348b6ed28353f1dcf14');
  assert.equal(correction.format, 'qr-atelier-explicit-baseline-corrections');
  assert.equal(correction.originalBaselineRevision, '372f456f7f42d980732681f86c3827f2a0b37aec');
  assert.equal(correction.reference.revision, '8d53996c18ee7692a06588dfe7cbb9cf6b6987cb');
  assert.equal(correction.unchangedOriginalCases, 721);
  assert.equal(correction.correctedCases, 32);
  assert.equal(correction.corrections.length, 32);
  const expectedIds = original.cases.filter(item => item.family === 'qr-model-1' && item.options.minVersion >= 7).map(item => item.id).sort();
  assert.deepEqual(correction.corrections.map(item => item.id).sort(), expectedIds);
  for (const item of correction.corrections) {
    const saved = original.cases.find(request => request.id === item.id);
    assert.deepEqual(item.originalExpected, saved.expected, item.id);
    assert.notEqual(item.expected.modulesSha256, item.originalExpected.modulesSha256, item.id);
    assert.notEqual(item.expected.resultSha256, item.originalExpected.resultSha256, item.id);
    assert.equal(item.expected.metadataSha256, item.originalExpected.metadataSha256, item.id);
    assert.equal(item.expected.wordsSha256, item.originalExpected.wordsSha256, item.id);
    assert.deepEqual(item.expected.summary, item.originalExpected.summary, item.id);
  }
});

test('Model 1 masks data in the version-information areas reserved only by Model 2', () => {
  for (const item of correction.corrections) {
    const saved = original.cases.find(request => request.id === item.id);
    const actual = new QrCore(saved.data, saved.options).generate();
    assert.deepEqual(digestResult(actual), item.expected, item.id);
    assert.equal(actual.model, 1);
    assert.equal(Object.hasOwn(actual, 'mask'), false, 'Default public metadata must remain unchanged.');
  }
});
