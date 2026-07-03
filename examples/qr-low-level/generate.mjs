import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { QrCore, QrSegment } from '../../libs/QRcore.js'
import { QrSvgRenderer } from '../../libs/QRsvg.js'

const here = dirname(fileURLToPath(import.meta.url))
const outputDir = resolve(here, 'generated')
mkdirSync(outputDir, { recursive: true })

const latinCapitalAWithDiaeresis = '\u00C4'

const examples = [
  {
    filename: '01-byte-only-hello-123.svg',
    title: 'Byte-only: HELLO 123',
    code: "new QrCore('HELLO 123', { mode: 'byte' }).generate()",
    qr: new QrCore('HELLO 123', { mode: 'byte' }).generate(),
  },
  {
    filename: '02-latin1-aeaeae.svg',
    title: 'ISO-8859-1 byte mode with ECI: \\u00C4\\u00C4\\u00C4',
    code: "new QrCore('\\u00C4\\u00C4\\u00C4', { mode: 'byte', encoding: 'iso-8859-1' }).generate()",
    qr: new QrCore(latinCapitalAWithDiaeresis.repeat(3), {
      mode: 'byte',
      encoding: 'iso-8859-1',
    }).generate(),
  },
  {
    filename: '03-manual-segments.svg',
    title: 'Manual numeric, alphanumeric, encoded byte, and raw byte segments',
    code: `new QrCore('', {
  segments: [
    QrSegment.numeric('123456'),
    QrSegment.alphanumeric('HELLO'),
    QrSegment.byte('\\u00C4', { encoding: 'iso-8859-1' }),
    QrSegment.bytes([0x20, 0x41]),
  ],
}).generate()`,
    qr: new QrCore('', {
      segments: [
        QrSegment.numeric('123456'),
        QrSegment.alphanumeric('HELLO'),
        QrSegment.byte(latinCapitalAWithDiaeresis, { encoding: 'iso-8859-1' }),
        QrSegment.bytes([0x20, 0x41]),
      ],
    }).generate(),
  },
]

const style = {
  size: 420,
  margin: 4,
  background: '#ffffff',
  colorStart: '#111111',
  colorEnd: '#111111',
  dotStyle: 'square',
  cornerStyle: 'square',
}

for (const example of examples) {
  const svg = new QrSvgRenderer(example.qr, style).render()
  writeFileSync(resolve(outputDir, example.filename), svg, 'utf8')
  console.log(`${example.filename}: version ${example.qr.version}, size ${example.qr.size}`)
}

const previewHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>QR low-level generated examples</title>
  <style>
    body { font-family: sans-serif; margin: 32px; background: #f6f4ef; color: #181818; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    article { background: white; border: 1px solid #ddd7cc; border-radius: 18px; padding: 20px; box-shadow: 0 12px 30px rgb(0 0 0 / 8%); }
    img { width: 100%; max-width: 420px; display: block; margin: 0 auto 16px; }
    code { display: block; white-space: pre-wrap; background: #f1eee8; padding: 10px; border-radius: 10px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>QR low-level generated examples</h1>
  <main>
    ${examples.map((example) => `<article><img src="${example.filename}" alt="${example.title}"><h2>${example.title}</h2><p>Version ${example.qr.version}, ${example.qr.size}x${example.qr.size}</p><code>${escapeHtml(example.code)}</code></article>`).join('\n    ')}
  </main>
</body>
</html>
`

writeFileSync(resolve(outputDir, 'preview.html'), previewHtml, 'utf8')

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
