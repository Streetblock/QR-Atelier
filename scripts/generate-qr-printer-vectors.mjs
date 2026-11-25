import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync, execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { QrCore } from '../libs/QRcore.js'
import { analyze, winner, strictlyDifferent } from './qr-printer-vector-analysis.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const toolkitArg = process.argv.indexOf('--toolkit')
if (toolkitArg < 0 || !process.argv[toolkitArg + 1]) throw new Error('Usage: node scripts/generate-qr-printer-vectors.mjs --toolkit PATH')
const toolkit = path.resolve(process.argv[toolkitArg + 1])
const load = relative => import(pathToFileURL(path.join(toolkit, relative)))
const { ZplGenerator } = await load('src/generator.js')
const { QrCore: ToolkitQr } = await load('src/barcodes/qr-core.js')
const { calculateZebraQrMaskPenalty: zebra } = await load('src/barcodes/qr-zpl-mask.js')
const { calculateQrMaskPenalty: generic } = await load('src/barcodes/qr-mask-penalty.js')
const output = path.join(root, 'examples/qr-n3-printer-study')
const cases = JSON.parse(readFileSync(path.join(output, 'cases.json'), 'utf8'))
const rows = matrix => matrix.map(row => row.map(Number).join(''))
const matrix = rows => rows.map(row => [...row].map(bit => bit === '1'))
const hash = rows => createHash('sha256').update(rows.join('\n')).digest('hex')
const vectors = cases.map(c => {
  const options = { mode: 'byte', encoding: 'iso-8859-1', eci: false, errorCorrectionLevel: c.level }
  assert.match(c.text, /^[a-z0-9]+$/)
  const candidates = Array.from({ length: 8 }, (_, mask) => new QrCore(c.text, { ...options, mask }).generate())
  assert.equal(candidates[0].version, c.version, 'Use the natural version; BQ has no version parameter')
  assert.ok(c.version <= 3)
  candidates.forEach((candidate, mask) => assert.deepEqual(candidate.modules,
    new ToolkitQr(c.text, { ...options, mask }).generate().modules, `${c.id}: Toolkit encoding`))
  const scores = candidates.map(c => analyze(c.modules, zebra, generic))
  const selected = Object.fromEntries(['iso', 'zebra', 'generic'].map(key => [key, winner(scores, key)]))
  assert.deepEqual(rows(new ToolkitQr(c.text, { ...options, maskPenaltyEvaluator: zebra }).generate().modules),
    rows(candidates[selected.zebra].modules))
  if (c.kind !== 'control') assert.ok(strictlyDifferent(scores, 'iso', 'zebra'), c.id)
  return { ...c, byteHex: Buffer.from(c.text, 'ascii').toString('hex'), size: candidates[0].modules.length,
    selected, scores, matrices: candidates.map(c => rows(c.modules)), hashes: candidates.map(c => hash(rows(c.modules))) }
})

function run(command, args, input) {
  const result = spawnSync(command, args, { cwd: root, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8',
      PYTHONPATH: [path.join(root, '.reference-deps/python'), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) } })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}
const allMatrices = vectors.flatMap(v => v.matrices)
const external = JSON.parse(run(process.env.PYTHON || 'python', ['reference-tests/support/qr_python.py'],
  JSON.stringify({ cases: [], matrices: allMatrices }))).scores
const jar = path.join(root, '.reference-deps/zxing-core-3.5.3.jar')
assert.equal(createHash('sha256').update(readFileSync(jar)).digest('hex'),
  '8d8064c1636fdaef7189dd9055c7d59950a8940a12f2293956446ec3c109fd82')
const classes = path.join(root, '.reference-deps/classes')
mkdirSync(classes, { recursive: true })
run(process.env.JAVAC || 'javac', ['-encoding', 'UTF-8', '-cp', jar, '-d', classes, 'reference-tests/support/QrReference.java'])
const javaScores = run(process.env.JAVA || 'java', ['-cp', [jar, classes].join(path.delimiter),
  'com.google.zxing.qrcode.encoder.QrReference'], allMatrices.map(m => `score\t${m.join('/')}`).join('\n') + '\n')
  .trim().split(/\r?\n/).map(line => line.split(',').map(Number))
vectors.forEach((v, i) => {
  v.scores.forEach((s, mask) => {
    const e = external[i * 8 + mask], j = javaScores[i * 8 + mask]
    assert.deepEqual([s.n1, s.n2, s.n4], [j[0], j[1], j[3]])
    assert.deepEqual([s.n1, s.n2, s.n4], [e.segno[0], e.segno[1], e.segno[3]])
    assert.equal(e.nayuki.total - e.nayuki.n3, s.n1 + s.n2 + s.n4)
    Object.assign(s, { nayuki: e.nayuki.total, nayukiN3: e.nayuki.n3,
      zxing: j.reduce((a, b) => a + b), zxingN3: j[2],
      segno: e.segno.reduce((a, b) => a + b), segnoN3: e.segno[2] })
  })
  for (const name of ['nayuki', 'zxing', 'segno']) v.selected[name] = winner(v.scores, name)
})

function graphic(rows, scale) {
  const pixels = (rows.length + 8) * scale
  const bytesPerRow = Math.ceil(pixels / 8)
  const data = Buffer.alloc(bytesPerRow * pixels)
  rows.forEach((row, y) => [...row].forEach((bit, x) => {
    if (bit !== '1') return
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = (x + 4) * scale + dx, py = (y + 4) * scale + dy
      data[py * bytesPerRow + (px >> 3)] |= 0x80 >> (px & 7)
    }
  }))
  return { type: 'graphic', compression: 'A', totalBytes: data.length, bytesPerRow, data: data.toString('hex').toUpperCase(), pixels }
}
const generator = new ZplGenerator()
const layout = []
const previewLabels = []
const profiles = [{ dpi: 203, dpmm: 8, scale: 3 }, { dpi: 300, dpmm: 12, scale: 5 }, { dpi: 600, dpmm: 24, scale: 9 }]
for (const profile of profiles) {
  const { dpi, dpmm, scale } = profile
  const dir = path.join(output, String(dpi))
  mkdirSync(dir, { recursive: true })
  const width = 50 * dpmm, height = 25 * dpmm
  const mm = value => Math.round(value * dpmm)
  const files = { '01-primary': [], '02-other-scorers': [], '03-all-masks': [], '00-bq-mask-parameter': [] }
  function label(v, columns, group, suffix) {
    const elements = [], placements = []
    const text = (value, x, y, fontMm = 1.5) => elements.push({ type: 'text', x, y, text: value,
      font: { id: '0', h: mm(fontMm), w: mm(fontMm / 2) }, rotation: 'N' })
    text(`${v.id} ${v.text} ${v.level}/V${v.version}`, mm(1), mm(.6), 1.4)
    columns.forEach((column, index) => {
      if (!column) return
      const pixels = (v.size + 8) * scale
      const x = mm(1 + 16 * index) + Math.floor((mm(16) - pixels) / 2), y = mm(5.5)
      assert.ok(x >= 0 && x + pixels <= width && y + pixels <= mm(22))
      text(column.caption, mm(1 + 16 * index), mm(3), 1.5)
      const placement = { ...column, vectorId: v.id, x, y, pixels, scale, size: v.size }
      placements.push(placement)
      if (column.native) {
        const element = { type: 'barcode', bcType: 'qrcode', x: x + 4 * scale, y: y + 4 * scale,
          rotation: 'N', qrModel: 2, scale, content: `${v.level}M,B${String(v.text.length).padStart(4, '0')}${v.text}` }
        if (column.mask !== undefined) Object.assign(element, { qrMask: column.mask, qrErrorCorrection: v.level })
        elements.push(element)
      } else elements.push({ ...graphic(v.matrices[column.mask], scale), x, y })
    })
    text(`${suffix}  ${dpi}dpi  m${scale}  BYTE/ECI0`, mm(1), mm(22.6), 1.25)
    const zpl = generator.generate({ width, height, homeX: 0, homeY: 0, defRotation: 'N', characterEncoding: 0,
      printOrientation: 'N', isMirrored: false, isReverse: false, elements })
      .replace('^XA\n', '^XA\n^MUD\n^LS0\n^LT0\n^FWN\n')
    const labelIndex = files[group].length
    files[group].push(zpl)
    layout.push({ file: `${dpi}/${group}.zpl`, labelIndex, vectorId: v.id, width, height, placements })
    if (dpi === 203 && ['01-primary', '02-other-scorers'].includes(group)) previewLabels.push({ v, columns: placements, elements, suffix, width, height })
  }
  for (const v of vectors) {
    label(v, [{ caption: `ISO m${v.selected.iso}`, mask: v.selected.iso },
      { caption: `TK-Z m${v.selected.zebra}`, mask: v.selected.zebra }, { caption: 'BQ e=omit', native: true }], '01-primary', 'PRIMARY')
    label(v, ['nayuki', 'zxing', 'segno'].map((name, i) => ({ caption: `${['NAY', 'ZX', v.selected.segno === v.selected.generic ? 'SG/TG' : 'SEG'][i]} m${v.selected[name]}`, mask: v.selected[name] })),
      '02-other-scorers', 'SAME BITS')
    for (let page = 0; page < 3; page++) label(v, Array.from({ length: 3 }, (_, i) => page * 3 + i < 8
      ? { caption: `MASK ${page * 3 + i}`, mask: page * 3 + i } : null), '03-all-masks', `ATLAS ${page + 1}/3`)
  }
  for (let page = 0; page < 3; page++) label(vectors[0], Array.from({ length: 3 }, (_, i) => {
    const mask = page * 3 + i
    return mask < 8 ? { caption: `BQ e=${mask}`, native: true, mask } : { caption: 'BQ e=omit', native: true }
  }), '00-bq-mask-parameter', `BQ TEST ${page + 1}/3`)
  for (const [name, labels] of Object.entries(files)) writeFileSync(path.join(dir, name + '.zpl'), labels.join('\n\n') + '\n')
}

const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="${previewLabels.length * 220 / 2}" viewBox="0 0 840 ${previewLabels.length * 220 / 2}"><rect width="100%" height="100%" fill="#eee"/>`
previewLabels.forEach((label, i) => {
  svg += `<g transform="translate(${10 + (i % 2) * 420} ${10 + Math.floor(i / 2) * 220})"><rect width="400" height="200" rx="4" fill="white" stroke="#aaa"/>`
  for (const element of label.elements) if (element.type === 'text') svg += `<text x="${element.x}" y="${element.y + element.font.h}" font-family="Arial,sans-serif" font-size="${element.font.h}">${esc(element.text)}</text>`
  for (const p of label.columns) {
    if (p.native) {
      svg += `<rect x="${p.x}" y="${p.y}" width="${p.pixels}" height="${p.pixels}" fill="#eee" stroke="#888" stroke-dasharray="3 2"/><text x="${p.x + 5}" y="${p.y + p.pixels / 2}" font-family="Arial" font-size="10">Drucker: offen</text>`
    } else {
      let d = ''
      label.v.matrices[p.mask].forEach((row, y) => [...row].forEach((bit, x) => { if (bit === '1') d += `M${p.x + (x + 4) * p.scale},${p.y + (y + 4) * p.scale}h${p.scale}v${p.scale}h-${p.scale}z` }))
      svg += `<path d="${d}" fill="black" shape-rendering="crispEdges"/>`
    }
  }
  svg += '</g>'
})
svg += '</svg>'
writeFileSync(path.join(output, 'preview.svg'), svg)
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const provenance = { toolkitCommit: git(toolkit, 'rev-parse', 'HEAD'), atelierCoreSha256: createHash('sha256').update(readFileSync(path.join(root, 'libs/QRcore.js'))).digest('hex'),
  atelierScorerSha256: createHash('sha256').update(readFileSync(path.join(root, 'libs/QRMaskPenalty.js'))).digest('hex'), nayuki: '1.8.0', zxing: '3.5.3', segno: '1.6.6' }
writeFileSync(path.join(output, 'vectors.json'), JSON.stringify({ provenance, profiles, vectors, layout }, null, 2) + '\n')
const headings = ['id', 'text', 'level', 'version', 'mask', 'N1', 'N2', 'N4', 'ISO_N3', 'TK_Z_N3', 'TK_generic_N3', 'ZX_N3', 'NAY_N3', 'SEG_N3', 'ISO_total', 'TK_Z_total', 'TK_generic_total', 'ZX_total', 'NAY_total', 'SEG_total']
const csv = [headings.join(',')]
for (const v of vectors) v.scores.forEach((s, mask) => csv.push([v.id, v.text, v.level, v.version, mask, s.n1, s.n2, s.n4, s.n3,
  s.zebra - s.n1 - s.n2 - s.n4, s.generic - s.n1 - s.n2 - s.n4, s.zxingN3, s.nayukiN3, s.segnoN3,
  s.iso, s.zebra, s.generic, s.zxing, s.nayuki, s.segno].join(',')))
writeFileSync(path.join(output, 'scores.csv'), csv.join('\n') + '\n')
console.log(JSON.stringify(vectors.map(({ id, text, version, selected }) => ({ id, text, version, selected })), null, 2))
