# Native PDF417 and MicroPDF417 core

The PDF417 foundation is browser-native ES modules with no runtime dependency.
It separates high-level compaction, modulo-929 Reed-Solomon error correction,
the shared three-cluster codeword patterns, and the two symbol layouts.

## Public API

```js
import { MicroPdf417Core, Pdf417Core } from '../libs/PDF417core.js'
import { Pdf417SvgRenderer } from '../libs/PDF417Svg.js'

const micro = new MicroPdf417Core('MICRO PDF417 1234567890123', {
  variant: '2x11',
}).generate()

const standard = new Pdf417Core('STANDARD PDF417', {
  columns: 4,
  rows: 10,
  errorCorrectionLevel: 2,
  truncated: false,
}).generate()

const svg = new Pdf417SvgRenderer(standard).render()
```

Both constructors accept a JavaScript string, `Uint8Array`, another typed-array
view, `ArrayBuffer`, or an array of byte values. Strings are converted to UTF-8.
Pass bytes when the caller must control the byte encoding exactly.

### SVG renderer

`Pdf417SvgRenderer` accepts the result of either `Pdf417Core` or
`MicroPdf417Core`. The aliases `PDF417SvgRenderer`, `MicroPdf417SvgRenderer`,
and `MicroPDF417SvgRenderer` refer to the same renderer.

The renderer produces barcode-faithful SVG paths with no rounded or decorative
modules. Adjacent dark modules in a row are merged into horizontal runs and the
SVG uses `shape-rendering="crispEdges"`. Standard PDF417 defaults to a row-height
ratio of 3, while MicroPDF417 defaults to 2. Standalone output includes a
two-module quiet zone by default.

```js
const svg = new Pdf417SvgRenderer(micro, {
  moduleSize: 2,
  rowHeight: 2,
  margin: 2,
  foreground: '#000000',
  background: '#ffffff', // use null for transparency
  width: 400,
  height: 120,
}).render()
```

`buildPdf417Path(modules, options)` is a compatibility wrapper around the neutral
`buildBarcodeMatrixPath` helper. Renderers can place its path inside a larger SVG
without nesting documents. `margin: 0` is useful when another symbology owns the
surrounding quiet zone.

### MicroPDF417 options

| Option | Default | Meaning |
| --- | --- | --- |
| `mode` | `auto` | `auto`, `text`, `byte`, or `numeric` compaction. |
| `variant` | automatic | Exact `columnsxrows` identifier such as `2x11`. |
| `columns` | automatic | Restrict selection to 1, 2, 3, or 4 data-codeword columns. |
| `rows` | automatic | Restrict selection to a standardized row count. |

When no size is supplied, the first standardized variant with sufficient data
capacity is selected. An explicit invalid combination, conflicting option, or
overflow throws; the core never substitutes a different explicit size.

The 34 variants are:

| Data columns | Standard row counts |
| --- | --- |
| 1 | 11, 14, 17, 20, 24, 28 |
| 2 | 8, 11, 14, 17, 20, 23, 26 |
| 3 | 6, 8, 10, 12, 15, 20, 26, 32, 38, 44 |
| 4 | 4, 6, 8, 10, 12, 15, 20, 26, 32, 38, 44 |

Each variant uses its standardized fixed ECC length and left, center, and right
Row Address Pattern start values. The public `MICRO_PDF417_VARIANTS` table also
exposes data capacity, ECC length, module width, and RAP starts.

### Standard PDF417 options

| Option | Default | Meaning |
| --- | --- | --- |
| `mode` | `auto` | `auto`, `text`, `byte`, or `numeric` compaction. |
| `errorCorrectionLevel` | `2` | PDF417 level 0 through 8 (2 through 512 ECC codewords). |
| `columns` | automatic | 1 through 30 data-codeword columns. |
| `rows` | automatic | 3 through 90 rows. |
| `truncated` | `false` | Emit Compact/Truncated PDF417 without the right indicator and stop pattern. |

If both rows and columns are supplied, they are exact constraints. Supplying
only one dimension lets the core calculate the other without exceeding the
PDF417 limits.

### Result object

Both cores return:

```js
{
  modules,             // boolean[][] with one entry per unscaled module
  rows,                // physical symbol rows
  columns,             // physical module columns
  dataColumns,         // codeword columns
  dataCodewords,       // padded data region; PDF417 includes its length descriptor
  errorCodewords,      // Reed-Solomon check codewords
  codewords,           // complete data + error sequence in row order
  compactedCodewords,  // high-level payload before padding/length descriptor
  variant,             // Micro size or standard columns/rows/ECC identifier
}
```

MicroPDF417 additionally returns `rowAddressPatterns`, which records the RAP
number and cluster used by every row. Standard PDF417 additionally returns
`errorCorrectionLevel` and `truncated`.

The lower-level modules export `compactPdf417`, the individual text/byte/numeric
compactors, generator coefficients, Reed-Solomon generation, and codeword-pattern
lookup for deterministic tests and future barcode adapters.

## Architecture

| File | Responsibility |
| --- | --- |
| `libs/BarcodeMatrixSvg.js` | Symbology-neutral boolean-matrix validation and SVG path construction. |
| `libs/PDF417Compaction.js` | Shared text, byte, numeric, and automatic compaction. |
| `libs/PDF417ErrorCorrection.js` | Generator-polynomial construction and Reed-Solomon ECC modulo 929. |
| `libs/PDF417Patterns.js` | Shared 3 × 929 standard codeword patterns. |
| `libs/PDF417core.js` | Size selection and separate PDF417/MicroPDF417 row layouts. |
| `libs/PDF417Svg.js` | Shared barcode-faithful SVG renderer and reusable path builder. |

`scripts/generate-pdf417-patterns.mjs` deterministically regenerates the pattern
table from the installed ZXing development package. The generated table is
ordinary project source; the core imports no reference encoder or decoder.

## Standards and reference verification

The implementation follows:

- [ISO/IEC 15438:2015, PDF417 bar code symbology specification](https://www.iso.org/standard/65502.html)
- [ISO/IEC 24728:2006, MicroPDF417 bar code symbology specification](https://www.iso.org/standard/38838.html)

Verification is deliberately outside the production path:

- Every one of the 34 MicroPDF417 variants has a complete module-raster fixture
  generated with [Barcode Writer in Pure PostScript](https://github.com/bwipp/postscriptbarcode).
- Standard PDF417 has an exact independent BWIPP raster fixture.
- The generated standard PDF417 matrix is independently decoded with
  [ZXing JavaScript](https://github.com/zxing-js/library).
- ZXing's Apache-2.0 PDF417 symbol assignments are used only by the development
  table generator and are not loaded by either core at runtime.

The deterministic suite also covers exact data/ECC boundaries for every Micro
variant, automatic transitions, invalid fixed sizes, all compaction modes,
binary data, long numeric runs, row-address/cluster sequences, PDF417 ECC levels
0 through 8, overflow, and repeatability.

## Known limits

- ECI, Macro PDF417, GS1/FNC1 convenience handling, and linked composite modes
  are not yet exposed. Exact non-UTF-8 payloads can already be supplied as bytes.
- The repository's independent ZXing decoder supports standard PDF417 but not
  MicroPDF417. MicroPDF417 therefore uses full BWIPP raster fixtures rather than
  an in-process independent decode test.
- This branch provides cores only. It does not add a new studio UI or a ZPL
  command parser/renderer.

## Planned zpl-toolkit integration

1. Add `^BF` parsing in zpl-toolkit and map its selected row/column combination
   to `MicroPdf417Core`. Keep ZPL orientation, row-height scaling, and painting in
   the renderer; the core already returns the unscaled boolean matrix.
2. Map `^BF` input bytes and explicit size validation without fallback. Surface
   core overflow/size errors as the toolkit's normal barcode diagnostics.
3. Replace the current `bwip-js` `^B7` encoder with `Pdf417Core`, mapping security
   to `errorCorrectionLevel`, ZPL data columns/rows to the same core options, and
   the truncated flag to `truncated`.
4. Reuse the existing ZPL barcode drawing path for both results. No PDF417-specific
   canvas logic belongs in either symbol core.
