import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import zxing from '@zxing/library'
import DecoderModule from '@zxing/library/cjs/core/qrcode/decoder/Decoder.js'
import { QrCore } from '../libs/QRcore.js'
import { calculateQrMaskPenalty } from '../libs/QRMaskPenalty.js'

const root = new URL('../examples/qr-n3-printer-study/', import.meta.url)
const { profiles, vectors, layout } = JSON.parse(readFileSync(new URL('vectors.json', root)))
const rows = matrix => matrix.map(row => row.map(Number).join(''))
const lookup = Object.fromEntries(vectors.map(v => [v.id, v]))

test('print vectors retain exact candidates, hashes, content and distinguishing mask choices', () => {
  const expected = { D01: [1, 6, 7, 6, 1, 7], S02: [0, 6, 0, 0, 6, 0], P03: [0, 4, 4, 5, 7, 4], C04: [2, 2, 2, 2, 2, 2] }
  const Decoder = DecoderModule.default ?? DecoderModule
  for (const v of vectors) {
    assert.deepEqual(['iso', 'zebra', 'generic', 'nayuki', 'zxing', 'segno'].map(key => v.selected[key]), expected[v.id])
    for (let mask = 0; mask < 8; mask++) {
      const qr = new QrCore(v.text, { mode: 'byte', encoding: 'iso-8859-1', eci: false, errorCorrectionLevel: v.level, mask }).generate()
      assert.equal(qr.version, v.version)
      assert.deepEqual(rows(qr.modules), v.matrices[mask])
      assert.equal(createHash('sha256').update(v.matrices[mask].join('\n')).digest('hex'), v.hashes[mask])
      assert.equal(calculateQrMaskPenalty(qr.modules), v.scores[mask].iso)
      const bits = new zxing.BitMatrix(v.size, v.size)
      qr.modules.forEach((row, y) => row.forEach((bit, x) => { if (bit) bits.set(x, y) }))
      assert.equal(new Decoder().decodeBitMatrix(bits).getText(), v.text)
    }
    if (v.kind !== 'control') {
      const a = v.scores[v.selected.iso], b = v.scores[v.selected.zebra]
      assert.ok(a.iso < b.iso && b.zebra < a.zebra, 'Each test must distinguish policies without a tie')
    }
  }
  assert.equal(lookup.D01.scores[1].doubleCount, 1)
  assert.equal(lookup.S02.scores[6].scaledCount, 1)
  assert.equal(lookup.P03.scores[0].partialCount, 1)
})

test('50 x 25 mm ZPL contains exact graphics, four-module quiet zones and controlled native fields', () => {
  const documents = new Map()
  for (const page of layout) {
    if (!documents.has(page.file)) documents.set(page.file, readFileSync(new URL(page.file, root), 'utf8').replaceAll('\r\n', '\n').match(/\^XA[\s\S]*?\^XZ/g))
    const zpl = documents.get(page.file)[page.labelIndex]
    const profile = profiles.find(p => page.file.startsWith(String(p.dpi)))
    assert.equal(page.width, 50 * profile.dpmm)
    assert.equal(page.height, 25 * profile.dpmm)
    assert.ok(zpl.includes(`^PW${page.width}\n^LL${page.height}`))
    for (const reset of ['^MUD', '^LS0', '^LT0', '^FWN', '^PON', '^PMN', '^LRN']) assert.ok(zpl.includes(reset))
    const fields = [...zpl.matchAll(/\^FO(\d+),(\d+)(\^GFA,[\s\S]*?\^FS|\^BQN,[\s\S]*?\^FS)/g)]
    assert.equal(fields.length, page.placements.length)
    page.placements.forEach((p, index) => {
      const v = lookup[p.vectorId], field = fields[index]
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.pixels <= page.width && p.y + p.pixels <= 22 * profile.dpmm)
      assert.equal(p.pixels, (v.size + 8) * p.scale)
      assert.equal(Number(field[1]), p.x + (p.native ? 4 * p.scale : 0))
      assert.equal(Number(field[2]), p.y + (p.native ? 4 * p.scale : 0))
      if (p.native) {
        const parameters = p.mask === undefined ? '' : `,${v.level},${p.mask}`
        assert.equal(field[3], `^BQN,2,${p.scale}${parameters}^FD${v.level}M,B${String(v.text.length).padStart(4, '0')}${v.text}^FS`)
      } else {
        const [, transmitted, total, stride, hex] = /^\^GFA,(\d+),(\d+),(\d+),([0-9A-F]+)\^FS$/.exec(field[3])
        const bytes = Buffer.from(hex, 'hex')
        assert.equal(bytes.length, Number(total))
        assert.equal(transmitted, total)
        assert.equal(Number(stride), Math.ceil(p.pixels / 8))
        assert.equal(bytes.length, Number(stride) * p.pixels)
        assert.ok(p.x + Number(stride) * 8 <= page.width, 'Byte padding stays on label')
        for (let y = 0; y < p.pixels; y++) for (let x = 0; x < Number(stride) * 8; x++) {
          const mx = Math.floor(x / p.scale) - 4, my = Math.floor(y / p.scale) - 4
          const expected = mx >= 0 && mx < v.size && my >= 0 && my < v.size && v.matrices[p.mask][my][mx] === '1'
          const actual = Boolean(bytes[y * Number(stride) + (x >> 3)] & (0x80 >> (x & 7)))
          assert.equal(actual, expected, `${page.file} ${v.id} mask=${p.mask} x=${x} y=${y}`)
        }
      }
    })
  }
  for (const [file, pages] of documents) assert.equal(pages.length, layout.filter(page => page.file === file).length)
})
