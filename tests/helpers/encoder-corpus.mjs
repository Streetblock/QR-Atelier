import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const BASELINE_REVISION = '372f456f7f42d980732681f86c3827f2a0b37aec';
export const CANONICALIZATION = 'sorted-enumerable-keys;ordered-arrays;tagged-typed-arrays-and-undefined;finite-numbers;utf8-json:v1';

// Preserve the public result's value and array types. No fields are omitted,
// rounded, normalized, or derived again from the current implementation.
export function canonicalValue(value) {
  if (value === undefined) return { $type: 'undefined' };
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('The corpus does not accept nonfinite numeric results.');
    return Object.is(value, -0) ? { $type: 'negative-zero' } : value;
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return { $type: value.constructor.name, values: Array.from(value, canonicalValue) };
  }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('The corpus accepts only plain result records, arrays, and typed arrays.');
  }
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
}

export const canonicalJson = value => JSON.stringify(canonicalValue(value));
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const resultHash = value => sha256(canonicalJson(value));

export async function loadCores(repoRoot) {
  const load = name => import(pathToFileURL(resolve(repoRoot, 'libs', name)).href);
  const [qr, micro, rmqr, dm, aztec, rune, maxi] = await Promise.all([
    load('QRcore.js'), load('MicroQRcore.js'), load('RMQRcore.js'), load('DMcore.js'),
    load('AztecCore.js'), load('AztecRuneCore.js'), load('MaxiCodeCore.js'),
  ]);
  return { ...qr, ...micro, ...rmqr, ...dm, ...aztec, ...rune, ...maxi };
}

export function generateCase(cores, request) {
  const data = request.inputKind === 'bytes' ? Uint8Array.from(request.data) : request.data;
  const options = structuredClone(request.options);
  const Core = { 'qr-model-2': cores.QrCore, 'qr-model-1': cores.QrCore,
    'micro-qr': cores.MicroQrCore, rmqr: cores.RMqrCore, 'data-matrix': cores.DmCore,
    dmre: cores.DmCore, aztec: cores.AztecCore, 'aztec-rune': cores.AztecRuneCore, maxicode: cores.MaxiCodeCore }[request.family];
  if (!Core) throw new TypeError(`Unknown corpus family: ${request.family}`);
  return new Core(data, options).generate();
}

export function digestResult(result) {
  const { modules, ...metadata } = result;
  const words = Object.fromEntries(['codewords', 'dataCodewords', 'errorCodewords', 'messageWords', 'checkWords',
    'modeMessageBits', 'stuffedBits', 'payloadBytes', 'encodedCodewords', 'dataWords'].filter(key => Object.hasOwn(result, key))
    .map(key => [key, result[key]]));
  return { resultSha256: resultHash(result), modulesSha256: resultHash(modules),
    metadataSha256: resultHash(metadata), wordsSha256: resultHash(words),
    summary: { rows: modules.length, columns: modules[0].length,
      ...(result.codewordSize === undefined ? {} : { codewordSize: result.codewordSize }),
      ...(result.checkWords === undefined ? {} : { checkWordCount: result.checkWords.length }),
      ...(result.errorCodewords === undefined ? {} : { errorWordCount: result.errorCodewords.length }),
      ...(result.codewords === undefined ? {} : { codewordCount: result.codewords.length }) } };
}
