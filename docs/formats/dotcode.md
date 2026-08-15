# DotCode

This branch adds a browser-native DotCode encoder and a separate SVG renderer. Production code has no runtime dependency on Zint, BWIPP, ZXing, a server, or a canvas implementation.

```js
import { DotCodeCore } from '../../libs/DotCodeCore.js'
import { DotCodeSvgRenderer } from '../../libs/DotCodeSvg.js'

const symbol = new DotCodeCore('https://example.com').generate()
const svg = new DotCodeSvgRenderer(symbol).render()
```

The core implements the Annex F numeric, A, B, and binary encodation paths, ECI (UTF-8 strings automatically use ECI 26), GS1 FNC1 separators, automatic or fixed symbol width, Reed-Solomon error correction over GF(113), all four data masks, forced-corner variants, mask scoring, and final dot placement. Pass GS (ASCII 29) inside a `Uint8Array` for an internal GS1 separator.

Options:

- `columns`: fixed width from 5 through 200; otherwise the recommended 3:2 shape is selected.
- `mask`: fixed mask from 0 through 7; 4 through 7 are the forced-corner variants.
- `eci`: explicit ECI value from 0 through 811799.
- `gs1`: encode ASCII 29 separators as FNC1.
- `readerProgramming`: add FNC3 at the start.

Structured Append and the automatic Macro 05/06/12 shortcuts are intentionally not exposed in this first core. Their payloads remain encodable as ordinary data.

Development conformance vectors come from AIM ISS DotCode 4.0 and Zint's DotCode tests. Zint and BWIPP remain external references and are not shipped or loaded by the library. Current ZXing-C++ releases do not expose DotCode in their public barcode-format API, so they are not used as a DotCode oracle.
