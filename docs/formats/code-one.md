# Code One

`feat/code-one-core` develops Code One independently from the other matrix families. Production code is browser-native and does not load Zint or BWIPP.

The first reviewed slice implements the numeric Version S family: S-10 (up to 6 digits), S-20 (up to 12), and S-30 (up to 18). It includes base-32 data conversion, GF(32) Reed-Solomon error correction, recognition patterns, exact matrix placement, automatic/forced subversion selection, and a separate SVG renderer.

The second slice adds the 16-row Version T family (T-16, T-32 and T-48), GF(256) Reed-Solomon error correction, exact recognition patterns, automatic or forced T sizing, Latin-1 ASCII/digit-pair encoding, compact C40 symbols at exact capacity, and the full 90-digit T-48 Decimal payload. Other payloads always use valid ASCII codewords instead of an external encoder.

```js
import { CodeOneCore } from '../../libs/CodeOneCore.js'
import { CodeOneSvgRenderer } from '../../libs/CodeOneSvg.js'

const symbol = new CodeOneCore('123456789012').generate()
const svg = new CodeOneSvgRenderer(symbol).render()

const compact = new CodeOneCore('ABCDEFGHIJKLM', { version: 'T' }).generate()
```

Versions A through H and the remaining Text/EDI/Byte high-level paths, GS1, ECI, and Structured Append remain the next implementation stages. Non-Latin-1 input is rejected until the ECI/Byte path is implemented; it is not silently converted or substituted.
