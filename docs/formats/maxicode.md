# MaxiCode

The MaxiCode feature branch adds a native encoder, raw-control parser, and SVG renderer without changing the shared root documentation.

## Library modules

- `libs/MaxiCodeCore.js` encodes the Primary and Secondary Messages, applies error correction, and places the fixed-size symbol.
- `libs/MaxiCodeRaw.js` converts textual control escapes into raw byte values.
- `libs/MaxiCodeSvg.js` renders the hexagonal module grid and central bullseye as SVG.
- `formats/maxicode.js` exposes modes, carrier fields, and raw input through the shared Format Registry.

## Supported modes

- Mode 4 for general-purpose data.
- Mode 5 for general-purpose data with enhanced error correction and a reduced capacity of 77 message codewords.
- Mode 6 for reader-programming commands with standard error correction and 93 message codewords. Scanners use this data to configure the reader rather than returning it as an ordinary scan result.
- Mode 2 with a numeric postal code of 1 through 9 digits.
- Mode 3 with a six-character alphanumeric postal code.
- Carrier-mode Primary Messages include the postal code, three-digit ISO country code, and three-digit service class.

Modes 2 through 4 and Mode 6 use 84 Secondary Message data codewords and 40 error-correction codewords. Mode 5 instead uses 68 Secondary Message data codewords and 56 error-correction codewords. The encoder validates mode-specific primary fields and packs them into the dedicated Primary Message. Secondary Message compaction and error correction are handled by the core.

The high-level encoder selects a minimum-codeword path across all five MaxiCode character sets. It considers single-character shifts, the two- and three-character shifts from Set B to Set A, persistent latches, and Numeric Shift blocks that compact each run of nine digits into six codewords.

## ECI and text encodings

The library encodes ISO-8859-1 by default, matching MaxiCode's default interpretation. UTF-8 is available with `encoding: 'utf-8'`; the encoder converts the input to UTF-8 bytes and emits ECI assignment number 26. Low-level callers may supply any ECI assignment number from 0 through 999999. ECI overhead participates in capacity validation, and Structured Carrier Message headers keep their required leading position by placing ECI immediately after the header and its two-digit version.

## Structured Append

Up to eight MaxiCode symbols can be linked with `structuredAppend: { index, count }`. Both values use the standard's 1-based numbering. The encoder emits the two-codeword Structured Append header at the beginning of the message, validates that the position does not exceed the symbol count, and includes both header codewords in capacity checks. The app exposes the same symbol count and position controls.

## Raw control input

Raw mode preserves control characters required by carrier payloads. It accepts decimal escapes and named aliases such as `~029` / `<GS>`, `~030` / `<RS>`, and `~004` / `<EOT>`. A doubled tilde represents a literal tilde.

## UPS Format 07 transport

`libs/UpsMaxiCode.js` adds a carrier-specific layer for Mode 2 and Mode 3. It accepts an already-compressed 32-byte Format 07 transport value or its 45-symbol base-55 representation, builds the ANSI secondary message without duplicating the postal code, country code, or service class stored in the Primary Message, and generates the complete MaxiCode symbol. A synthetic vector for the public Gymnasium Korschenbroich address whose substitutions occupy all 252 payload bits is used as a byte-exact fixture.

The app exposes this as `UPS Format 07 transport`; visible `~ddd` and named control escapes remain available for the CR, FS, and GS symbols in the transport alphabet. This layer intentionally does not turn arbitrary address fields into the patent's 252 substitution bits: the published material does not fully specify the four framing/truncation bits, so the encoder requires verified precompressed bytes or symbols instead of guessing a proprietary rule.

## App integration

The format adapter dynamically shows carrier fields for modes 2 and 3 and supplies valid mode-specific postal defaults when switching modes. QR-specific dot, finder, and logo styling is disabled for MaxiCode.

## Tests

`npm test` covers raw escape parsing, control preservation, modes 2 through 6, carrier-field validation, Primary Message packing, UPS Format 07 transport conversion, optimal high-level segmentation, numeric capacity, ECI, Structured Append, rendering, and the registry adapter. `npm run test:reference` verifies modes 2 through 5 through decoding, checks Mode 6 module extraction plus both Reed-Solomon regions, and reconstructs UPS Primary/Secondary messages with the shared ZXing dependency. ZXing does not expose semantic Mode 6 decoding.
