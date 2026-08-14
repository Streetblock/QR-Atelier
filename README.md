# QR-Atelier

> Generate sharp 2D barcodes with a browser-native studio, not a bloated toolchain.

[Read the German version here](README_de.md)

QR-Atelier is a minimalist, performant, and completely dependency-free QR Code studio. The project cleanly separates matrix logic from SVG rendering. Everything runs directly in the browser - no build steps, no bundlers, and no framework overhead.

On `main`, the studio focuses on QR Code. Additional 2D barcode families live in feature branches:
* `feat/aztec-code`
* `feat/datamatrix`
* `feat/datamatrix-legacy`
* `feat/micro-qr-core`
* `feat/maxi-code`
* `feat/rmqr-core`

The reusable native PDF417 foundation on `feat/pdf417-core` provides all 34
MicroPDF417 variants plus a standard PDF417 core. See
[`docs/pdf417-core.md`](docs/pdf417-core.md) for its low-level API, validation
rules, reference coverage, and the planned ZPL `^BF`/`^B7` integration path.

Repository: [https://github.com/Streetblock/QR-Atelier](https://github.com/Streetblock/QR-Atelier)

## Features

* Zero Dependencies: No `npm`, no Webpack, no framework. Just pure ES6 vanilla JavaScript, modern HTML, and CSS.
* Live Preview: The selected barcode is instantly and efficiently re-rendered on every input thanks to built-in debouncing.
* QR Code Studio: The main branch ships the QR Code experience.
* In-depth Styling: Choose between different dot styles, finder shapes, and smooth SVG color gradients.
* Center Logo Support: Upload your own logo for QR Code. The studio app automatically switches to error correction level H in the background.
* Local Export: Direct download of the result as a vector (`SVG`) or raster image (`PNG` up to 2048x2048px).
* URL Parameters: Populate the studio directly via URL parameters: `?url=https://your-link.com`.

## Data Matrix ECC 000-140 (this branch)

This branch contains an experimental, dependency-free encoder core for the
historic Data Matrix ECC 000, ECC 050, ECC 080, ECC 100, and ECC 140 family.
It is intentionally separate from the modern ECC 200 and DMRE core. The legacy
encoder currently exposes a JavaScript API for browser and Node.js use; it is
not yet integrated into the studio UI.

```js
import { generateLegacyDataMatrix } from './libs/DMlegacy.js'

const symbol = generateLegacyDataMatrix('A', {
  ecc: 80,
  format: 6,
  symbolSize: 13,
})
```

The five values are selectable protection levels of one historic symbol
family, not five successive Data Matrix generations:

* ECC 000 uses the legacy CRC and placement pipeline without corrective
  convolutional redundancy.
* ECC 050, 080, 100, and 140 add increasing amounts of convolutional error
  correction. Higher levels reduce the payload capacity of a given symbol.
* Legacy symbols are square, use odd dimensions from 9x9 through 49x49, and
  support six historic data format IDs.
* ECC 200 is a different design: it uses Reed-Solomon error correction, even
  symbol dimensions, and modern square and rectangular formats.

### Standards history and compatibility scope

Data Matrix predates its ISO standardization. In 1996, the AIM Technical
Symbology Committee added ECC 200 and published the improved symbology as an
AIM standard. ISO/IEC 16022:2000 and ISO/IEC 16022:2006 subsequently specified
both ECC 000-140 and ECC 200. The third edition, ISO/IEC 16022:2024, explicitly
removed the historic ECC 000-140 variant from the standard.

This implementation therefore exists for legacy interoperability, archival
research, encoder and decoder conformance testing, and faithful reproduction of
existing symbols. It is not a recommendation to create new deployments with
legacy ECC; current applications should use ECC 200.

The complete encoder pipeline has been checked module-for-module against a
physically independent implementation for all five ECC levels using format ID
6. The tested fixtures matched in all 933 symbol modules. Implementation
details and source notes are in
[`docs/formats/datamatrix-legacy.md`](docs/formats/datamatrix-legacy.md) and
[`docs/formats/datamatrix-legacy-implementation-spec.md`](docs/formats/datamatrix-legacy-implementation-spec.md).

References:

* [AIM history: ECC 200 was added and published in 1996](https://www.aimglobal.org/aim-1990/)
* [ISO/IEC 16022:2000](https://www.iso.org/standard/29833.html)
* [ISO/IEC 16022:2024](https://www.iso.org/standard/80926.html)

## Architecture & Library Scope

The project stays intentionally small and uses one core and one renderer per barcode family:

### 1. `QRcore.js` and `QRsvg.js`
The QR Code core and renderer.
* Generates QR matrices with Reed-Solomon error correction.
* Supports QR Code Model 2 versions 1-40 by default and legacy QR Code Model 1 versions 1-14 through the `model: 1` option.
* Supports Numeric, Alphanumeric, and Byte mode plus ECI for UTF-8, ISO-8859-1, and Windows-1252. QR Kanji mode is not currently supported.
* Uses UTF-8 as the default Byte-mode encoding; library consumers can select another supported encoding through `QrCore` options.
* Automatically selects a bit-efficient combination of Numeric, Alphanumeric, and Byte segments for each QR version range.
* Supports QR Structured Append for splitting one message across 2 to 16 symbols, including the standard sequence and parity header.
* Automatically selects the best mask pattern.
* Renders the QR matrix in the chosen visual style.

### 2. `RMQRcore.js`
The separate ISO/IEC 23941 rectangular Micro QR core.
* Supports all 32 standard symbol sizes from R7x43 through R17x139 and error correction levels M and H.
* Encodes Numeric, Alphanumeric, and Byte segments with automatic segmentation and deterministic symbol selection.
* Supports automatic and explicit ECI, including UTF-8, ISO-8859-1, Windows-1252, raw bytes, and assignment numbers from 0 to 999999.
* Supports GS1 with FNC1 in first position, including GS separators and the GS1 percent escaping required in Alphanumeric mode.
* Uses the standard fixed rMQR data mask and a two-module quiet zone in the renderer.
* Kanji is not currently supported. Structured Append is not part of the rMQR mode set.

### 3. `app.js` and `styles.css`
The app controller and UI. Manages state, binds DOM events, and provides the interface through the shared format registry. The studio uses the cores' UTF-8 defaults and exposes only the options declared by each format adapter.

## Installation & Usage

1. Clone the repository
   ```bash
   git clone https://github.com/Streetblock/QR-Atelier.git
   cd QR-Atelier
   ```

2. Start a local server
   Since ES6 modules (`import`/`export`) are used, the project must be served via a local web server. Opening `index.html` directly via `file://` is blocked by browsers for security reasons.

   Using VS Code? Start the Live Server extension.

   Using Python?
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

3. Use the libs from Node.js
   With the repo's ESM setup, the barcode libraries can also be imported from Node:
   ```js
   import { QrCore } from './libs/QRcore.js'
   import { QrSvgRenderer } from './libs/QRsvg.js'

   const data = new QrCore('https://example.com').generate()
   const svg = new QrSvgRenderer(data).render()

   const legacyData = new QrCore('LEGACY', { model: 1, maxVersion: 14 }).generate()
   ```

   Model 1 intentionally rejects ECI segments. Model 2 remains the default for new applications.

   For rMQR, use the dedicated core with the same renderer:
   ```js
   import { RMqrCore, RMqrSegment } from './libs/RMQRcore.js'
   import { QrSvgRenderer } from './libs/QRsvg.js'

   const data = new RMqrCore('RMQR REFERENCE', {
     errorCorrectionLevel: 'H',
   }).generate()
   const svg = new QrSvgRenderer(data).render()

   const explicitEci = new RMqrCore('', {
     segments: [
       RMqrSegment.eci(3),
       RMqrSegment.byte('é', { encoding: 'iso-8859-1' }),
     ],
   }).generate()

   const gs1 = new RMqrCore(`010123456789012810ABC\x1d21123`, {
     gs1: true,
   }).generate()
   ```

   GS1 input uses the canonical element string: omit brackets around application identifiers and insert ASCII GS (`\x1d`) after variable-length fields when another element follows. The core encodes FNC1 and separators but deliberately does not maintain or validate the GS1 application-identifier dictionary. GS1 and ECI cannot be combined.

4. Split a message with QR Structured Append
   ```js
   import { QrCore, calculateQrStructuredAppendParity } from './libs/QRcore.js'

   const completeMessage = 'ONE MESSAGE ACROSS TWO SYMBOLS'
   const parts = ['ONE MESSAGE ', 'ACROSS TWO SYMBOLS']
   const parity = calculateQrStructuredAppendParity(completeMessage)

   const symbols = parts.map((part, index) => new QrCore(part, {
     structuredAppend: {
       position: index + 1,
       total: parts.length,
       parity,
     },
   }).generate())
   ```

   Calculate the parity from the complete unsplit message, using the same byte encoding as the QR data. Splitting the message itself remains application-specific.

## File Structure

```text
QR-Atelier/
|-- index.html
|-- package.json
|-- styles.css
|-- app.js
`-- libs/
    |-- DMlegacy.js
    |-- DMlegacyPlacement.js
    |-- QRcore.js
    |-- RMQRcore.js
    `-- QRsvg.js
```

## Contributing

Ideas for new barcode styles, broader QR support, or UI improvements are welcome. The experimental 2D barcode work lives in the feature branches listed above, while `main` stays focused on QR Code.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
