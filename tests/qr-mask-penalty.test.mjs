import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateQrMaskPenalty } from '../libs/QRMaskPenalty.js'
import { QrCore } from '../libs/QRcore.js'

function createCheckerboard(size) {
  return Array.from({ length: size }, (_, y) => (
    Array.from({ length: size }, (_, x) => (x + y) % 2 === 0)
  ))
}

function transpose(matrix) {
  return matrix.map((_, y) => matrix.map((row) => row[y]))
}

test('counts an N3 occurrence with light areas on both sides only once', () => {
  const modules = createCheckerboard(15)
  modules[0] = [...'000010111010000'].map((value) => value === '1')

  assert.equal(calculateQrMaskPenalty(modules), 40)
})

test('does not score the external quiet zone as matrix modules', () => {
  const modules = createCheckerboard(15)
  modules[0] = [...'101110110101010'].map((value) => value === '1')

  assert.equal(calculateQrMaskPenalty(modules), 0)
})

test('applies standard N3 evaluation to columns', () => {
  const modules = createCheckerboard(15)
  modules[0] = [...'000010111010000'].map((value) => value === '1')

  assert.equal(calculateQrMaskPenalty(transpose(modules)), 40)
})

test('selects the standard minimum-penalty mask end to end', () => {
  const options = {
    errorCorrectionLevel: 'L',
    minVersion: 1,
    maxVersion: 1,
    mode: 'byte',
    encoding: 'iso-8859-1',
    eci: false,
  }
  const automatic = new QrCore('a', options).generate()
  const expected = new QrCore('a', { ...options, mask: 3 }).generate()

  assert.deepEqual(automatic.modules, expected.modules)
})
