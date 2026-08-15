# Code One

`feat/code-one-core` develops Code One independently from the other matrix families. Production code is browser-native and does not load Zint or BWIPP.

The first reviewed slice implements the numeric Version S family: S-10 (up to 6 digits), S-20 (up to 12), and S-30 (up to 18). It includes base-32 data conversion, GF(32) Reed-Solomon error correction, recognition patterns, exact matrix placement, automatic/forced subversion selection, and a separate SVG renderer.

```js
import { CodeOneCore } from '../../libs/CodeOneCore.js'
import { CodeOneSvgRenderer } from '../../libs/CodeOneSvg.js'

const symbol = new CodeOneCore('123456789012').generate()
const svg = new CodeOneSvgRenderer(symbol).render()
```

Versions T-16/T-32/T-48 and A through H, including their general ASCII/C40/Text/EDI/Decimal/Byte high-level encoder, GS1, ECI, and Structured Append, remain the next implementation stages and are not silently substituted by Version S.
