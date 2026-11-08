import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { QrCore } from '../libs/QRcore.js'
import { calculateQrMaskPenalty } from '../libs/QRMaskPenalty.js'
import { qrMaskScoreParts } from '../tests/helpers/qr-mask-oracle.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dependencies = path.join(root, '.reference-deps')
const jar = path.join(dependencies, 'zxing-core-3.5.3.jar')
assert.equal(createHash('sha256').update(readFileSync(jar)).digest('hex'),
  '8d8064c1636fdaef7189dd9055c7d59950a8940a12f2293956446ec3c109fd82', 'Run scripts/setup-qr-references.py')
const classes = path.join(dependencies, 'classes')
mkdirSync(classes, { recursive: true })
function run(command, args, input) {
  const result = spawnSync(command, args, {
    cwd: root, input, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8',
      PYTHONPATH: [path.join(dependencies, 'python'), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) },
  })
  if (result.error) throw new Error(`${command}: ${result.error.message}\n${result.stderr || ''}`, { cause: result.error })
  assert.equal(result.status, 0, `${command}: ${result.stderr}`)
  return result.stdout
}
run(process.env.JAVAC || 'javac', ['-encoding', 'UTF-8', '-cp', jar, '-d', classes, 'reference-tests/support/QrReference.java'])
const cases = Array.from({ length: 40 }, (_, i) => ({
  id: `v${i + 1}`, version: i + 1, level: ['L', 'M', 'Q', 'H'][i % 4],
  text: `iso ${i + 1}`, mode: 'byte', encoding: 'iso-8859-1', eci: false,
}))
cases.push(
  { id: 'numeric', version: 2, level: 'M', text: '01234567890123456789', mode: 'numeric' },
  { id: 'alphanumeric', version: 3, level: 'Q', text: 'ISO 18004:2015 / QR', mode: 'alphanumeric' },
  { id: 'latin1', version: 4, level: 'H', text: 'Grüße £ÿ', mode: 'byte', encoding: 'iso-8859-1', eci: false },
  { id: 'utf8-eci', version: 7, level: 'M', text: 'Grüße 世界 🌍', mode: 'byte', encoding: 'utf-8', eci: true },
)
const options = c => ({ mode: c.mode, encoding: c.encoding || 'iso-8859-1', eci: c.eci || false,
  minVersion: c.version, maxVersion: c.version, errorCorrectionLevel: c.level })
const rows = matrix => matrix.map(row => row.map(Number).join(''))
const modules = rows => rows.map(row => [...row].map(bit => bit === '1'))
const candidates = cases.map(c => Array.from({ length: 8 }, (_, mask) => rows(new QrCore(c.text, { ...options(c), mask }).generate().modules)))
const probes = [
  // Expected N3: Atelier, ZXing Java, Nayuki, Segno. These are deliberate disagreements.
  { id: 'both sides', line: '000010111010000', n3: [40, 40, 80, 40] },
  { id: 'outside border', line: '101110110101010', n3: [0, 0, 0, 40] },
  { id: 'scaled, four whites', line: '0000110011111100110000', n3: [40, 0, 80, 0] },
  { id: 'scaled, internal four whites', line: '1000011001111110011000010', n3: [40, 0, 0, 0] },
  { id: 'partial dark run', line: '00001110111010000', n3: [0, 40, 0, 40] },
]
function probeMatrix(line) {
  const size = line.length
  const matrix = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => (x + y) % 2 === 0))
  matrix[0] = [...line].map(bit => bit === '1')
  return rows(matrix)
}
const matrices = [...candidates.flat(), ...probes.map(p => probeMatrix(p.line))]
const python = JSON.parse(run(process.env.PYTHON || 'python', ['reference-tests/support/qr_python.py'], JSON.stringify({ cases, matrices })))
const encodeLine = (c, mask) => ['encode', c.version, c.level, mask, c.encoding || 'iso-8859-1', Buffer.from(c.text).toString('base64')].join('\t')
const javaInput = [...cases.flatMap(c => Array.from({ length: 9 }, (_, index) => encodeLine(c, index - 1))),
  ...matrices.map(m => `score\t${m.join('/')}`)].join('\n') + '\n'
const java = run(process.env.JAVA || 'java', ['-cp', [jar, classes].join(path.delimiter),
  'com.google.zxing.qrcode.encoder.QrReference'], javaInput).trim().split(/\r?\n/)
const javaScores = java.slice(cases.length * 9).map(line => line.split(',').map(Number))

test('fixed-mask matrices match Nayuki and ZXing Java across all 40 versions', () => {
  cases.forEach((c, index) => {
    for (let mask = 0; mask < 8; mask++) {
      assert.deepEqual(candidates[index][mask], python.encoded[index].nayuki[mask], `${c.id}, mask=${mask}, Nayuki`)
      const [mode, returnedMask, matrix] = java[index * 9 + mask + 1].split(':')
      assert.equal(mode.toLowerCase(), c.mode, `${c.id}: ZXing segment mode`)
      assert.equal(Number(returnedMask), mask)
      assert.deepEqual(candidates[index][mask], matrix.split('/'), `${c.id}, mask=${mask}, ZXing Java`)
    }
  })
})

test('Segno matrices agree for identical codewords; its extra padding byte is explicitly accounted for', t => {
  let paddingDifferences = 0
  cases.forEach((c, index) => {
    const reference = python.encoded[index]
    const boundary = reference.segnoPaddingStart
    const extraByte = boundary % 8 === 0
    assert.equal(reference.segnoPaddingAdded, 8 - boundary % 8, c.id)
    if (extraByte) {
      paddingDifferences++
      const offset = boundary / 8
      assert.deepEqual(reference.segnoCodewords,
        [...reference.nayukiCodewords.slice(0, offset), 0, ...reference.nayukiCodewords.slice(offset, -1)], c.id)
    } else {
      assert.deepEqual(reference.segnoCodewords, reference.nayukiCodewords, c.id)
    }
    for (let mask = 0; mask < 8; mask++) {
      assert.deepEqual(reference.segno[mask], reference.segnoCodewordsNayuki[mask], `${c.id}, mask=${mask}: identical codewords`)
      if (!extraByte) assert.deepEqual(reference.segno[mask], candidates[index][mask], `${c.id}, mask=${mask}`)
      else assert.notDeepEqual(reference.segno[mask], candidates[index][mask], `${c.id}, mask=${mask}: known padding difference`)
    }
  })
  assert.ok(paddingDifferences > 0 && paddingDifferences < cases.length)
  t.diagnostic(`Segno extra padding byte in ${paddingDifferences}/${cases.length} cases`)
})

test('N1, N2 and N4 match external scorers; total disagreements are isolated to N3', () => {
  matrices.forEach((matrix, index) => {
    const ours = qrMaskScoreParts(modules(matrix))
    assert.equal(calculateQrMaskPenalty(modules(matrix)), ours.total)
    for (const scores of [javaScores[index], python.scores[index].segno]) {
      assert.deepEqual([ours.n1, ours.n2, ours.n4], [scores[0], scores[1], scores[3]], `matrix=${index}`)
    }
    const nayuki = python.scores[index].nayuki
    assert.equal(nayuki.total - nayuki.n3, ours.n1 + ours.n2 + ours.n4, `Nayuki non-N3, matrix=${index}`)
  })
})

test('automatic mask selection follows each encoder scoring policy', t => {
  const differences = { nayuki: 0, zxing: 0, segno: 0 }
  cases.forEach((c, index) => {
    const firstMinimum = scores => scores.indexOf(Math.min(...scores))
    const ours = candidates[index].map(matrix => calculateQrMaskPenalty(modules(matrix)))
    const best = firstMinimum(ours)
    assert.deepEqual(rows(new QrCore(c.text, options(c)).generate().modules), candidates[index][best])
    const [mode, mask, matrix] = java[index * 9].split(':')
    assert.equal(mode.toLowerCase(), c.mode)
    assert.deepEqual(matrix.split('/'), candidates[index][Number(mask)])
    assert.equal(Number(mask), firstMinimum(javaScores.slice(index * 8, index * 8 + 8).map(s => s.reduce((a, b) => a + b))))
    assert.equal(python.encoded[index].nayukiMask,
      firstMinimum(python.scores.slice(index * 8, index * 8 + 8).map(s => s.nayuki.total)))
    // Segno evaluates before writing format/version bits; its auto mask need not
    // minimize scores of the completed matrices used by the comparisons above.
    assert.equal(python.encoded[index].segnoSelectionScores.length, 8)
    assert.equal(python.encoded[index].segnoMask, firstMinimum(python.encoded[index].segnoSelectionScores))
    assert.deepEqual(python.encoded[index].segnoAutomatic, python.encoded[index].segno[python.encoded[index].segnoMask])
    for (const [name, selected] of Object.entries({ nayuki: python.encoded[index].nayukiMask,
      segno: python.encoded[index].segnoMask, zxing: Number(mask) })) {
      if (selected !== best) differences[name]++
    }
  })
  t.diagnostic(`Different automatic masks out of ${cases.length}: ${JSON.stringify(differences)}`)
})

test('N3 interpretation differences have explicit regression expectations', () => {
  probes.forEach((probe, index) => {
    const offset = candidates.length * 8 + index
    assert.deepEqual([qrMaskScoreParts(modules(matrices[offset])).n3, javaScores[offset][2],
      python.scores[offset].nayuki.n3, python.scores[offset].segno[2]], probe.n3, probe.id)
  })
})
