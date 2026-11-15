import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = name => readFile(new URL(`../libs/${name}`, import.meta.url), 'utf8');

test('all six binary encoder implementations use one internal RS module without their former arithmetic copies', async () => {
  const names = ['QRcore.js', 'MicroQRcore.js', 'RMQRcore.js', 'DMcore.js', 'AztecCore.js', 'MaxiCodeCore.js'];
  for (const name of names) {
    const text = await source(name);
    assert.equal([...text.matchAll(/from ['"]\.\/internal\/BinaryReedSolomon\.js['"]/gu)].length, 1, name);
    assert.match(text, /\bencodeBinaryReedSolomon\(/u, name);
    assert.doesNotMatch(text, /\b(?:function|class)\s+(?:reedSolomonRemainder|reedSolomonGenerator|multiplyFiniteField|createEccBlock|createGeneratorFactors|initDmGaloisTables|dmMultiplyLog|reedSolomonCheckWords|rsGeneratorPoly|polyMultiply|createGenericGF|GenericGF|GenericGFPoly|ReedSolomonEncoder)\b/u, name);
    assert.doesNotMatch(text, /\b(?:DM_PRIMITIVE|DM_FACTORS|DM_FACTOR_SETS|DM_LOG|DM_ALOG|MAXICODE_FIELD_64)\b/u, name);
  }
  const rune = await source('AztecRuneCore.js');
  assert.match(rune, /import \{ buildAztecRuneMatrix \} from ['"]\.\/AztecCore\.js['"]/u);
  assert.match(rune, /\bbuildAztecRuneMatrix\(this\.value\)/u);
});

test('PDF417 prime-field correction and Legacy CRC/convolution remain separate format algorithms', async () => {
  const [pdf, correction, legacy] = await Promise.all([source('PDF417core.js'), source('PDF417ErrorCorrection.js'), source('DMlegacy.js')]);
  assert.match(pdf, /from ['"]\.\/PDF417ErrorCorrection\.js['"]/u);
  assert.match(pdf, /generatePdf417ErrorCorrection\(dataCodewords, variant\.errorCodewords\)/u);
  assert.match(pdf, /generatePdf417ErrorCorrection\(dataCodewords, errorCodewordCount\)/u);
  assert.match(correction, /const MODULUS = 929\b/u);
  assert.match(correction, /const GENERATOR = 3\b/u);
  assert.match(legacy, /\bfunction encodeLegacyConvolution\(/u);
  for (const text of [pdf, correction, legacy]) assert.doesNotMatch(text, /BinaryReedSolomon|encodeBinaryReedSolomon/u);
});

test('shared arithmetic stays private rather than becoming a public encoder-package math API', async () => {
  for (const entry of ['qr-atelier', 'qr-atelier/cores']) {
    const api = await import(entry);
    assert.equal(Object.hasOwn(api, 'BINARY_RS_FIELDS'), false, entry);
    assert.equal(Object.hasOwn(api, 'encodeBinaryReedSolomon'), false, entry);
  }
  await assert.rejects(import('qr-atelier/libs/internal/BinaryReedSolomon.js'), error => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
});
