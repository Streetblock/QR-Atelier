import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { DmCore } from '../libs/DMcore.js'

// Independent test-only decoder. No raster files or Python bytecode are written.
const decoder = `import json,sys,zxingcpp
d=json.load(sys.stdin); m=d['modules']; q=4; s=4; h=(len(m)+q*2)*s; w=(len(m[0])+q*2)*s
p=bytearray([255])*(w*h)
for y,row in enumerate(m):
 for x,on in enumerate(row):
  if on:
   for yy in range(s):
    for xx in range(s): p[((y+q)*s+yy)*w+(x+q)*s+xx]=0
r=zxingcpp.read_barcode(memoryview(p).cast('B',shape=(h,w)),formats=zxingcpp.BarcodeFormat.DataMatrix,is_pure=True,text_mode=zxingcpp.TextMode.Plain)
if r is None: raise RuntimeError('ZXing-C++ could not decode the native marker symbol')
print(json.dumps({'text':r.text,'bytes':list(r.bytes),'identifier':r.symbology_identifier}))
`

test('native zero-sentinel marker boundaries preserve exact payload bytes through independent ZXing-C++ readback', () => {
  const python = process.env.PYTHON || 'python3'
  const requests = [
    { text: 'ABCDEFGH', words: [241, 27], mode: 'edifact', suffix: '', expected: 'ABCDEFGH' },
    { text: 'ABCDEFGH', words: [241, 27], mode: 'edifact', suffix: 'XYZ', expected: 'ABCDEFGHXYZ' },
    { text: 'ABCDEFGH', words: [241, 27], mode: 'c40', suffix: '', expected: 'ABCDEFGH' },
    { text: 'abcdefgh', words: [241, 27], mode: 'text', suffix: '', expected: 'abcdefgh' },
    { text: 'ABCDEFGH', words: [241, 27], mode: 'x12', suffix: '', expected: 'ABCDEFGH' },
    { text: 'ABCDEFGH', words: [232], mode: 'edifact', suffix: '', expected: 'ABCDEFGH\x1d' },
    { text: 'ABCDEFGH', words: [129], mode: 'edifact', suffix: '', expected: 'ABCDEFGH' },
    { text: 'A', words: [129], mode: 'ascii', suffix: '', expected: 'A' },
    { text: '', words: [232], mode: 'ascii', suffix: 'ABC', expected: 'ABC', identifier: ']d2' },
  ]
  for (const request of requests) {
    const prefix = new TextEncoder().encode(request.text)
    const input = Uint8Array.from([...prefix, 0, ...new TextEncoder().encode(request.suffix)])
    const generated = new DmCore(input, {
      modes: [request.mode], specialCodewords: new Map([[prefix.length, request.words]]),
    }).generate()
    const result = spawnSync(python, ['-B', '-c', decoder], {
      input: JSON.stringify({ modules: generated.modules }), encoding: 'utf8', windowsHide: true,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    })
    const description = `${request.mode} ${JSON.stringify(request.words)} ${JSON.stringify(request.text)} + ${JSON.stringify(request.suffix)}`
    assert.equal(result.status, 0, `${description}: ${result.stderr || result.error?.message}`)
    const decoded = JSON.parse(result.stdout)
    assert.deepEqual(decoded.bytes, Array.from(new TextEncoder().encode(request.expected)), description)
    assert.equal(decoded.text, request.expected, description)
    if (request.identifier) assert.equal(decoded.identifier, request.identifier, description)
  }
})
