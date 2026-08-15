# Code One

`feat/code-one-core` develops Code One independently from the other matrix families. Production code is browser-native and does not load Zint or BWIPP.

The first reviewed slice implements the numeric Version S family: S-10 (up to 6 digits), S-20 (up to 12), and S-30 (up to 18). It includes base-32 data conversion, GF(32) Reed-Solomon error correction, recognition patterns, exact matrix placement, automatic/forced subversion selection, and a separate SVG renderer.

The second slice adds the 16-row Version T family (T-16, T-32 and T-48), GF(256) Reed-Solomon error correction, exact recognition patterns, automatic or forced T sizing, Latin-1 ASCII/digit-pair encoding, compact C40 symbols at exact capacity, and the full 90-digit T-48 Decimal payload. Other payloads always use valid ASCII codewords instead of an external encoder.

The general family now covers Versions A through H, including all fixed geometries, interleaved GF(256) error-correction blocks, and automatic or forced sizing. Its high-level encoder supports ASCII, the basic C40 and Text character sets, EDI, Decimal, and Byte as explicit whole-payload modes. Automatic mode compares every compatible whole-payload encoding and uses the shortest one that fits. Shifted C40/Text characters and mixed mode switching inside one payload are the remaining optimizations; ASCII fallback keeps supported Latin-1 payloads valid in the meantime.

```js
import { CodeOneCore } from '../../libs/CodeOneCore.js'
import { CodeOneSvgRenderer } from '../../libs/CodeOneSvg.js'

const symbol = new CodeOneCore('123456789012').generate()
const svg = new CodeOneSvgRenderer(symbol).render()

const compact = new CodeOneCore('ABCDEFGHIJKLM', { version: 'T' }).generate()

const general = new CodeOneCore('gosgos', {
  version: 'A-H',
  mode: 'text',
}).generate()

const unicode = new CodeOneCore('Grüße', {
  version: 'A-H',
  encoding: 'utf-8',
  eci: 26,
}).generate()
```

For GS1, pass the normalized element string and ASCII GS (`\x1D`) separators with `gs1: true`; parsing bracketed or parenthesized application identifiers belongs to a separate GS1 parser. Structured Append accepts `{ index, count }` with a count from 2 through 128 and cannot be combined with GS1. UTF-8 requires an explicit ECI assignment.

The remaining work is optimal mixed-mode segmentation and sharing the new control/high-level layer with Version T. Versions S deliberately reject GS1, ECI, and Structured Append, as required by their restricted numeric design. No production path loads Zint, BWIPP, or another barcode encoder.
