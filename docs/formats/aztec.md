# Aztec Code

The Aztec feature branch adds a native encoder and SVG renderer while keeping the shared root documentation unchanged.

## Library modules

- `libs/AztecCore.js` performs high-level text encoding, symbol planning, Reed-Solomon error correction, and module placement.
- `libs/AztecSvg.js` renders compact and full symbols as SVG.
- `formats/aztec.js` exposes Aztec Code and its visual style through the shared Format Registry.
- `libs/AztecRuneCore.js` exposes the separate 11 x 11 Aztec Rune API for integer values from 0 through 255.
- `formats/aztec-rune.js` makes Aztec Rune independently selectable while reusing the Aztec SVG renderer.

## Symbol planning

- Automatic selection between compact and full symbols.
- Compact symbols with 1 through 4 layers.
- Full symbols with the supported larger layer range and reference grid.
- Configurable minimum and maximum layers and the ability to force compact or full mode.
- Variable error-correction percentage, with the Aztec recommendation used by default.
- Automatic calculation of actual data and check words for the selected word size and layer count.

## High-level encoding

The encoder plans transitions among the Aztec text tables and binary data to minimize the encoded bit stream. Symbol selection includes mode-message, bit-stuffing, and error-correction costs rather than considering payload bytes alone.

## App integration

The format adapter declares the Aztec module style. Supported renderer styles are square, rounded, dots, and classy. QR-specific finder styling and center logos are disabled.

## Aztec Rune

Aztec Rune is the fixed-size Annex A member of the Aztec family, not a zero-layer shortcut through the normal text encoder. It accepts exactly one integer from 0 through 255, produces an 11 x 11 matrix, adds five GF(16) Reed-Solomon check words to the two data words, applies the Rune bit complement pattern, and uses the shared Aztec bullseye placement and SVG renderer.

```js
import { AztecRuneCore } from '../../libs/AztecRuneCore.js'
import { AztecSvgRenderer } from '../../libs/AztecSvg.js'

const rune = new AztecRuneCore(125).generate()
const svg = new AztecSvgRenderer(rune).render()
```

## Tests

`npm test` covers high-level encoding, compact/full planning, layer and ECC selection, mode messages, Reed-Solomon structure, placement, rendering, and the registry adapter. `npm run test:reference` compares matrices and decoded payloads with `@zxing/library`.
