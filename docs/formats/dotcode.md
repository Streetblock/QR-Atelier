# DotCode

This branch adds a browser-native DotCode encoder and a separate SVG renderer. Production code has no runtime dependency on Zint, BWIPP, ZXing, a server, or a canvas implementation.

```js
import { DotCodeCore } from '../../libs/DotCodeCore.js'
import { DotCodeSvgRenderer } from '../../libs/DotCodeSvg.js'

const symbol = new DotCodeCore('https://example.com').generate()
const svg = new DotCodeSvgRenderer(symbol).render()
```

The core implements the Annex F numeric, A, B, and binary encodation paths, ECI (non-ASCII strings use UTF-8 and automatically add ECI 26), GS1 separators, automatic or fixed symbol width, Reed-Solomon error correction over GF(113), all four data masks, forced-corner variants, mask scoring, and final dot placement. Pass GS (ASCII 29) inside a `Uint8Array` for an internal GS1 separator.

Options:

- `columns`: fixed width from 5 through 200; otherwise the recommended 3:2 shape is selected.
- `mask`: fixed mask from 0 through 7; 4 through 7 are the forced-corner variants.
- `eci`: explicit ECI value from 0 through 811799.
- `gs1`: enable GS1 mode and use ASCII 29 as the separator in input.
- `readerProgramming`: add FNC3 at the start.

Structured Append and the automatic Macro 05/06/12 shortcuts are intentionally not exposed in this first core. Their payloads remain encodable as ordinary data.

## SVG presentation

`DotCodeSvgRenderer` takes a generated symbol and optional style settings. The SVG uses black modules on a white background. By default it uses round dots, an 8 px module, a dot diameter of 0.8 modules, and a three-module quiet zone. Use `dotShape: 'square'` for square modules. `dotScale` sets the diameter or side length as a fraction of a module, and `margin` sets the quiet zone in modules.

The [browser example](../../examples/dotcode/browser.html) shows the same symbol with round and square modules. From the repository root, run `python -m http.server --bind 127.0.0.1` and open `http://127.0.0.1:8000/examples/dotcode/browser.html`.

## Reference checks

[AIM ISS DotCode 4.0](https://www.aim-na.org/press-releases/dotcode-symbology-specification-published) is the symbology reference. The existing encoder tests cover AIM Figure 7 mask vectors and Zint encodation vectors. For the examples in the [cab JScript Programming Manual, section 4.2.14](https://www.cab.de/media/pushfile.cfm?file=3047#page=108), the default encoder output was compared cell by cell to the printed grids and to the independent [BWIPP DotCode encoder](https://github.com/bwipp/postscriptbarcode/blob/master/src/dotcode.ps.src) (BWIPP 2026-05-28, via bwip-js 4.11.2). [Zint](https://zint.org.uk/manual/chapter/6/) 2.16.0 gave the same matrices.

| Payload | cab style | Matrix | Lit modules | Differences |
| --- | --- | --- | --- | --- |
| `Dotcode` | Square | 21 × 14 | 82 | 0 |
| `Test` | Round | 17 × 12 | 61 | 0 |
| `dots` | Inverted round | 17 × 12 | 61 | 0 |

BWIPP comparison used `raw('dotcode', value, '')[0]` and its `pixx`, `pixy`, and row-major `pixs` fields. The Zint check unpacked the output of `zint -b DOTCODE -d <value> --dump` most-significant bit first and cropped each row to the symbol width. The cab check sampled the center of each cell and treated white cells as active in the inverted sample. All three checks used automatic sizing and masking. The matrices are also covered by `npm test`. Physical print and scanner performance remain untested.
