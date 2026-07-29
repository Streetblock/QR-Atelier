# MaxiCode

The MaxiCode feature branch adds a native encoder, raw-control parser, and SVG renderer without changing the shared root documentation.

## Library modules

- `libs/MaxiCodeCore.js` encodes the Primary and Secondary Messages, applies error correction, and places the fixed-size symbol.
- `libs/MaxiCodeRaw.js` converts textual control escapes into raw byte values.
- `libs/MaxiCodeSvg.js` renders the hexagonal module grid and central bullseye as SVG.
- `formats/maxicode.js` exposes modes, carrier fields, and raw input through the shared Format Registry.

## Supported modes

- Mode 4 for general-purpose data.
- Mode 2 with a numeric postal code of 1 through 9 digits.
- Mode 3 with a six-character alphanumeric postal code.
- Carrier-mode Primary Messages include the postal code, three-digit ISO country code, and three-digit service class.

The encoder validates mode-specific primary fields and packs them into the dedicated Primary Message. Secondary Message compaction and error correction are handled by the core.

## Raw control input

Raw mode preserves control characters required by carrier payloads. It accepts decimal escapes and named aliases such as `~029` / `<GS>`, `~030` / `<RS>`, and `~004` / `<EOT>`. A doubled tilde represents a literal tilde.

## App integration

The format adapter dynamically shows carrier fields for modes 2 and 3 and supplies valid mode-specific postal defaults when switching modes. QR-specific dot, finder, and logo styling is disabled for MaxiCode.

## Tests

`npm test` covers raw escape parsing, control preservation, modes 2 through 4, carrier-field validation, Primary Message packing, payload capacity, rendering, and the registry adapter. No external reference decoder is currently required by this branch.
