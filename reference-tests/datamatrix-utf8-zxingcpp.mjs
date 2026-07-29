import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { DmCore } from '../libs/DMcore.js'

function findPython() {
  const candidates = [...new Set([process.env.PYTHON, 'python3', 'python'].filter(Boolean))]
  for (const executable of candidates) {
    const probe = spawnSync(executable, ['--version'], { encoding: 'utf8' })
    if (!probe.error && probe.status === 0) return executable
  }
  throw new Error('Python is required for Data Matrix UTF-8 reference tests. Set the PYTHON environment variable if it is not on PATH.')
}

function matrixToLuminance(result, quietZone = 4, moduleSize = 4) {
  const width = (result.cols + quietZone * 2) * moduleSize
  const height = (result.rows + quietZone * 2) * moduleSize
  const luminance = new Uint8Array(width * height).fill(255)
  for (let y = 0; y < result.rows; y += 1) {
    for (let x = 0; x < result.cols; x += 1) {
      if (!result.modules[y][x]) continue
      for (let moduleY = 0; moduleY < moduleSize; moduleY += 1) {
        for (let moduleX = 0; moduleX < moduleSize; moduleX += 1) {
          const targetY = (y + quietZone) * moduleSize + moduleY
          const targetX = (x + quietZone) * moduleSize + moduleX
          luminance[targetY * width + targetX] = 0
        }
      }
    }
  }
  return { luminance, width, height }
}

test('UTF-8 ECI symbols roundtrip through ZXing-C++', () => {
  const python = findPython()
  const decoder = fileURLToPath(new URL('./decode-datamatrix-zxingcpp.py', import.meta.url))
  const directory = mkdtempSync(join(tmpdir(), 'qr-atelier-dm-eci-'))
  const payloads = ['Grüße aus Köln', 'Emoji 🙂 und 汉字', 'Καλημέρα κόσμε', 'مرحبا بالعالم']

  try {
    for (let index = 0; index < payloads.length; index += 1) {
      const payload = payloads[index]
      const generated = new DmCore(payload).generate()
      assert.equal(generated.eciAssignmentNumber, 26)
      assert.deepEqual(generated.dataCodewords.slice(0, 2), [241, 27])

      const { luminance, width, height } = matrixToLuminance(generated)
      const imagePath = join(directory, `symbol-${index}.gray`)
      writeFileSync(imagePath, luminance)
      const decoded = spawnSync(python, [decoder, imagePath, String(width), String(height)], { encoding: 'utf8' })
      assert.equal(decoded.status, 0, decoded.stderr || decoded.error?.message)
      assert.equal(JSON.parse(decoded.stdout).text, payload)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
