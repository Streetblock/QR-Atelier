import assert from 'node:assert/strict'
import test from 'node:test'
import zxing from '@zxing/library'
import DecoderModule from '@zxing/library/cjs/core/qrcode/decoder/Decoder.js'
import { QrCore } from '../libs/QRcore.js'
import { calculateQrMaskPenalty } from '../libs/QRMaskPenalty.js'
import { qrMaskScoreParts } from './helpers/qr-mask-oracle.mjs'

function decode(modules) {
  // Decode sampled modules directly: this checks QR data and error correction
  // independently of image detection (which can fail on sparse, large symbols).
  const Decoder = DecoderModule.default ?? DecoderModule
  const size = modules.length
  const matrix = new zxing.BitMatrix(size, size)
  for (let y = 0; y < modules.length; y++) for (let x = 0; x < modules.length; x++) {
    if (modules[y][x]) matrix.set(x, y)
  }
  return new Decoder().decodeBitMatrix(matrix).getText()
}

test('matches an independent window-based scorer on 1000 deterministic matrices', () => {
  let seed = 0x180042
  for (let sample = 0; sample < 1000; sample++) {
    const size = 21 + 4 * (sample % 10)
    const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
      return (seed >>> 0) % 100 < 20 + sample % 61
    }))
    const before = JSON.stringify(matrix)
    assert.equal(calculateQrMaskPenalty(matrix), qrMaskScoreParts(matrix).total, `sample=${sample}`)
    assert.equal(JSON.stringify(matrix), before)
  }
})

test('N4 agrees with integer interval arithmetic for every possible density in all QR versions', () => {
  for (let version = 1; version <= 40; version++) {
    const area = (17 + 4 * version) ** 2
    for (let dark = 0; dark <= area; dark++) {
      const percentage = 100 * dark / area
      assert.equal(Math.floor(Math.abs(percentage - 50) / 5) * 10,
        Math.floor(Math.abs(20 * dark - 10 * area) / area) * 10)
    }
  }
})

test('chooses the independently scored minimum of eight complete candidates and remains decodable', () => {
  const versions = [1, 2, 6, 7, 9, 10, 26, 27, 40]
  for (const [index, version] of versions.entries()) {
    const text = `ISO ${version}`
    const options = {
      mode: 'byte', encoding: 'iso-8859-1', eci: false,
      minVersion: version, maxVersion: version,
      errorCorrectionLevel: ['L', 'M', 'Q', 'H'][index % 4],
    }
    const candidates = Array.from({ length: 8 }, (_, mask) => new QrCore(text, { ...options, mask }).generate())
    const scores = candidates.map(candidate => qrMaskScoreParts(candidate.modules).total)
    const best = scores.indexOf(Math.min(...scores))
    const automatic = new QrCore(text, options).generate()
    assert.deepEqual(automatic.modules, candidates[best].modules, `version=${version}, scores=${scores}`)
    assert.equal(decode(automatic.modules), text)
    for (const [mask, candidate] of candidates.entries()) {
      assert.equal(calculateQrMaskPenalty(candidate.modules), scores[mask])
      assert.equal(decode(candidate.modules), text, `version=${version}, mask=${mask}`)
    }
  }
})

test('longer light margins add no duplicate N3 penalty and rotation preserves the total', () => {
  const size = 29
  const matrix = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => (x + y) % 2 === 0))
  matrix[0] = [...'00000000101110100000000101010'].map(bit => bit === '1')
  assert.equal(matrix[0].length, size)
  const parts = qrMaskScoreParts(matrix)
  assert.equal(parts.n3, 40)
  assert.equal(calculateQrMaskPenalty(matrix), parts.total)
  const rotated = matrix.map((_, x) => matrix.map(row => row[x]).reverse())
  assert.equal(calculateQrMaskPenalty(rotated), parts.total)
})
