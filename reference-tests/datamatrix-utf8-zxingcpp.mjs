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

function decodeWithZxingCpp(python, decoder, directory, payload, options, filename) {
  const generated = new DmCore(payload, options).generate()
  const { luminance, width, height } = matrixToLuminance(generated)
  const imagePath = join(directory, filename)
  writeFileSync(imagePath, luminance)
  const process = spawnSync(python, [decoder, imagePath, String(width), String(height)], { encoding: 'utf8' })
  assert.equal(process.status, 0, process.stderr || process.error?.message)
  return { generated, decoded: JSON.parse(process.stdout) }
}

test('UTF-8 ECI symbols roundtrip through ZXing-C++', () => {
  const python = findPython()
  const decoder = fileURLToPath(new URL('./decode-datamatrix-zxingcpp.py', import.meta.url))
  const directory = mkdtempSync(join(tmpdir(), 'qr-atelier-dm-eci-'))
  const payloads = ['Grüße aus Köln', 'Emoji 🙂 und 汉字', 'Καλημέρα κόσμε', 'مرحبا بالعالم']

  try {
    for (let index = 0; index < payloads.length; index += 1) {
      const payload = payloads[index]
      const { generated, decoded } = decodeWithZxingCpp(python, decoder, directory, payload, {}, `utf8-${index}.gray`)
      assert.equal(generated.eciAssignmentNumber, 26)
      assert.deepEqual(generated.dataCodewords.slice(0, 2), [241, 27])
      assert.equal(decoded.text, payload)
    }

    const rawPayload = new TextEncoder().encode('Raw bytes: Grüße')
    const { generated, decoded } = decodeWithZxingCpp(
      python,
      decoder,
      directory,
      rawPayload,
      { eci: 26 },
      'utf8-raw.gray',
    )
    assert.equal(generated.encoding, null)
    assert.deepEqual(generated.dataCodewords.slice(0, 2), [241, 27])
    assert.deepEqual(decoded.bytes, Array.from(rawPayload))
    assert.equal(decoded.text, 'Raw bytes: Grüße')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('GS1 FNC1 and group separators roundtrip through ZXing-C++', () => {
  const python = findPython()
  const decoder = fileURLToPath(new URL('./decode-datamatrix-zxingcpp.py', import.meta.url))
  const directory = mkdtempSync(join(tmpdir(), 'qr-atelier-dm-gs1-'))
  const separator = String.fromCharCode(29)
  const payloads = [
    '01095011015300031727123110ABC123',
    `010950110153000310ABC123${separator}17271231`,
    `010950110153000310Grüße🙂${separator}17271231`,
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ${separator}ABCDEFGHIJKLMNOPQRSTUVWXYZ`,
    `abcdefghijklmnopqrstuvwxyz${separator}abcdefghijklmnopqrstuvwxyz`,
  ]

  try {
    for (let index = 0; index < payloads.length; index += 1) {
      const payload = payloads[index]
      const { generated, decoded } = decodeWithZxingCpp(python, decoder, directory, payload, { gs1: true }, `gs1-${index}.gray`)
      assert.equal(generated.gs1, true)
      assert.equal(generated.dataCodewords[0], 232)
      assert.equal(decoded.symbologyIdentifier, ']d2')
      assert.deepEqual(decoded.bytes, Array.from(new TextEncoder().encode(payload)))
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Structured Append and its GS1 combination roundtrip through ZXing-C++', () => {
  const python = findPython()
  const decoder = fileURLToPath(new URL('./decode-datamatrix-zxingcpp.py', import.meta.url))
  const directory = mkdtempSync(join(tmpdir(), 'qr-atelier-dm-structured-append-'))
  const payload = 'PART THREE'

  try {
    const { generated, decoded } = decodeWithZxingCpp(python, decoder, directory, payload, {
      structuredAppend: { position: 3, total: 7, fileId: [1, 15] },
    }, 'structured-append.gray')
    assert.deepEqual(generated.dataCodewords.slice(0, 4), [233, 42, 1, 15])
    assert.equal(decoded.text, payload)
    assert.deepEqual(decoded.bytes, Array.from(new TextEncoder().encode(payload)))

    const gs1Payload = '010950110153000317271231'
    const { generated: gs1Generated, decoded: gs1Decoded } = decodeWithZxingCpp(python, decoder, directory, gs1Payload, {
      gs1: true,
      structuredAppend: { position: 1, total: 2, fileId: 15 },
    }, 'structured-append-gs1.gray')
    assert.deepEqual(gs1Generated.dataCodewords.slice(0, 5), [233, 15, 1, 15, 232])
    assert.equal(gs1Decoded.symbologyIdentifier, ']d2')
    assert.deepEqual(gs1Decoded.bytes, Array.from(new TextEncoder().encode(gs1Payload)))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
