# Aztec Code

The Aztec feature branch adds a native encoder and SVG renderer while keeping the shared root documentation unchanged.

## Library modules

- `libs/AztecCore.js` performs high-level text encoding, symbol planning, Reed-Solomon error correction, and module placement.
- `libs/AztecSvg.js` renders compact and full symbols as SVG.
- `formats/aztec.js` exposes Aztec Code and its visual style through the shared Format Registry.

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

## Tests

`npm test` covers high-level encoding, compact/full planning, layer and ECC selection, mode messages, Reed-Solomon structure, placement, rendering, and the registry adapter. `npm run test:reference` compares matrices and decoded payloads with `@zxing/library`.
