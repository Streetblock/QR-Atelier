# Data Matrix ECC 200

The Data Matrix feature branch adds a dependency-free ECC 200 encoder and SVG renderer without changing the shared root documentation.

## Library modules

- `libs/DMcore.js` builds the ECC 200 symbol, data regions, and error-correction codewords.
- `libs/DMminimal.js` selects compact encodation segments and the smallest permitted symbol.
- `libs/DMsvg.js` renders the generated matrix as SVG.
- `formats/datamatrix.js` exposes Data Matrix through the shared Format Registry. The app uses UTF-8.

## Symbols and encodation

- All 24 classic square sizes from 10x10 through 144x144.
- The six classic rectangular sizes: 8x18, 8x32, 12x26, 12x36, 16x36, and 16x48.
- Automatic, square-only, rectangle-only, constrained, and exact-size selection.
- Minimal segmentation across ASCII, C40, Text, ANSI X12, EDIFACT, and Base256.
- UTF-8 by default with ECI assignment 26 when required; ISO-8859-1 remains optional.
- ECC 200 error correction is determined by the selected symbol size rather than a user-selectable QR-style level.

## Extended control functions

- GS1 mode with leading FNC1 and ASCII 29 encoded as FNC1 group separators.
- Macro 05 and Macro 06, including optional recognition of complete Macro frames.
- Structured Append for sets of 2 through 16 symbols, with numeric or explicit file-identification codewords.
- Reader Programming mode with codeword 234 at the start of the symbol.

The library accepts raw GS1 element strings. It does not interpret parenthesized human-readable notation or validate Application Identifier rules. Splitting Structured Append payloads remains the caller's responsibility. DMRE sizes are not currently included.

## Tests

`npm test` covers symbol selection, minimal encodation, ECC placement, GS1, Macro, Structured Append, Reader Programming, rendering, and the registry adapter. `npm run test:reference` performs ZXing round-trip checks; UTF-8 and GS1 reference cases require the Python ZXing-C++ binding installed by CI.
