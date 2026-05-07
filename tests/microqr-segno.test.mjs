import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { MicroQrCore } from '../libs/MicroQRcore.js'

function matrixToString(modules) {
  return modules.map((row) => row.map((value) => (value ? '1' : '0')).join('')).join('\n')
}

function normalizeMatrixText(text) {
  return String(text).replace(/\r\n/g, '\n').trim()
}

function segnoEncodingFromByteEncoding(byteEncoding, mode) {
  if (mode === 'kanji') return 'shift_jis'
  if (byteEncoding === 'latin1') return 'iso-8859-1'
  if (byteEncoding === 'utf8') return 'utf-8'
  if (byteEncoding === 'windows1252') return 'cp1252'
  if (byteEncoding === 'shift_jis') return 'shift_jis'
  return null
}

function runSegnoReference({ data, version, error, mode, mask, byteEncoding }) {
  const payload = {
    data,
    version,
    error,
    mode,
    mask,
    encoding: segnoEncodingFromByteEncoding(byteEncoding, mode),
  }

  const input = JSON.stringify(payload)
  const commands = ['python', 'py']
  let lastError = null

  for (const cmd of commands) {
    const proc = spawnSync(cmd, ['tests/segno_micro_reference.py'], {
      input,
      encoding: 'utf8',
      cwd: process.cwd(),
    })

    if (proc.error) {
      lastError = proc.error
      continue
    }
    if (proc.status !== 0) {
      throw new Error(`segno helper failed (${cmd}): ${proc.stderr || proc.stdout}`)
    }
    return normalizeMatrixText(proc.stdout)
  }

  throw new Error(`Could not execute Python interpreter: ${String(lastError)}`)
}

function coreOptionsForCase(c) {
  return {
    preferredMode: c.mode,
    minVersion: c.version,
    maxVersion: c.version,
    errorCorrectionLevel: c.error,
    mask: c.mask,
    byteEncoding: c.byteEncoding,
  }
}

const CASES = [
  { name: 'M1 numeric NONE mask0', data: '12345', version: 'M1', error: 'NONE', mode: 'numeric', mask: 0, byteEncoding: 'latin1' },
  { name: 'M2 numeric M mask1', data: '12345678', version: 'M2', error: 'M', mode: 'numeric', mask: 1, byteEncoding: 'latin1' },
  { name: 'M2 alnum L mask0', data: 'HELLO', version: 'M2', error: 'L', mode: 'alphanumeric', mask: 0, byteEncoding: 'latin1' },
  { name: 'M3 alnum L mask2', data: 'HELLO123', version: 'M3', error: 'L', mode: 'alphanumeric', mask: 2, byteEncoding: 'latin1' },
  { name: 'M4 byte latin1 L mask0', data: '\u00fc\u00f6\u00e4\u00e2', version: 'M4', error: 'L', mode: 'byte', mask: 0, byteEncoding: 'latin1' },
  { name: 'M4 byte utf8 L mask3', data: '\u00fc\u00f6\u00e4\u00e2', version: 'M4', error: 'L', mode: 'byte', mask: 3, byteEncoding: 'utf8' },
  { name: 'M4 byte windows1252 L mask1', data: 'Gr\u00fc\u00dfe \u20ac', version: 'M4', error: 'L', mode: 'byte', mask: 1, byteEncoding: 'windows1252' },
  { name: 'M4 byte shift_jis L mask2', data: '\uff8a\uff9d\uff76\uff78', version: 'M4', error: 'L', mode: 'byte', mask: 2, byteEncoding: 'shift_jis' },
  { name: 'M4 kanji L mask0', data: '\u6771\u4eac', version: 'M4', error: 'L', mode: 'kanji', mask: 0, byteEncoding: 'shift_jis' },
]

for (const c of CASES) {
  test(c.name, () => {
    const ours = new MicroQrCore(c.data, coreOptionsForCase(c)).generate()
    const oursMatrix = normalizeMatrixText(matrixToString(ours.modules))
    const refMatrix = runSegnoReference(c)
    assert.equal(oursMatrix, refMatrix)
  })
}
