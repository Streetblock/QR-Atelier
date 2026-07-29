# Micro QR

The Micro QR feature branch adds a dependency-free Micro QR encoder and SVG renderer without changing the shared root documentation.

## Library modules

- `libs/MicroQRcore.js` selects and encodes Micro QR versions M1 through M4.
- `libs/MicroQRsvg.js` renders the generated module matrix as SVG.
- `formats/microqr.js` exposes the encoder and renderer through the shared Format Registry.

## Supported encoding

- Versions: M1, M2, M3, and M4, with configurable minimum and maximum versions.
- Error correction: version-compatible `NONE`, `L`, `M`, and `Q` levels.
- Modes: automatic, Numeric, Alphanumeric, Byte, and Kanji.
- Byte encodings: ISO-8859-1 (`latin1`) by default, plus UTF-8, Windows-1252, and Shift JIS.
- Automatic mode selection chooses a compact representation within the configured version range.

UTF-8 can require more symbol capacity than Latin-1. Japanese input is generally most compact with Shift JIS and Kanji mode.

## App integration

The format adapter declares its Micro QR options and enables dot styling. Finder-corner styling and center logos are not exposed for Micro QR.

## Tests

`npm test` runs the self-contained encoder, renderer, and adapter tests. `npm run test:reference` compares generated matrices with Segno and therefore requires the Python reference-test dependencies installed by CI.
