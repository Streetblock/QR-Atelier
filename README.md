# QR-Atelier

> Generate sharp 2D barcodes with a browser-native studio, not a bloated toolchain.

[Read the German version here](README_de.md)

QR-Atelier is a minimalist, performant, and completely dependency-free QR Code studio. The project cleanly separates matrix logic from SVG rendering. Everything runs directly in the browser - no build steps, no bundlers, and no framework overhead.

On `main`, the studio focuses on QR Code. Additional 2D barcode families live in feature branches:
* `feat/aztec-code`
* `feat/datamatrix`
* `feat/micro-qr-core`
* `feat/maxi-code`

Repository: [https://github.com/Streetblock/QR-Atelier](https://github.com/Streetblock/QR-Atelier)

## Features

* Zero Dependencies: No `npm`, no Webpack, no framework. Just pure ES6 vanilla JavaScript, modern HTML, and CSS.
* Live Preview: The selected barcode is instantly and efficiently re-rendered on every input thanks to built-in debouncing.
* QR Code Studio: The main branch ships the QR Code experience.
* In-depth Styling: Choose between different dot styles, finder shapes, and smooth SVG color gradients.
* Center Logo Support: Upload your own logo for QR Code. The system automatically switches to error correction level H in the background.
* Local Export: Direct download of the result as a vector (`SVG`) or raster image (`PNG` up to 2048x2048px).
* URL Parameters: Populate the studio directly via URL parameters: `?url=https://your-link.com`.

## Architecture & Library Scope

The project stays intentionally small and uses one core and one renderer per barcode family:

### 1. `QrCore.js` and `QrSvg.js`
The QR Code core and renderer.
* Generates QR matrices with Reed-Solomon error correction.
* Automatically selects the best mask pattern.
* Renders the QR matrix in the chosen visual style.

### 2. `app.js` and `styles.css`
The app controller and UI. Manages state, binds DOM events, and provides the interface.

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
   import { QrCore } from './libs/QrCore.js'
   import { QrSvgRenderer } from './libs/QrSvg.js'

   const data = new QrCore('https://example.com').generate()
   const svg = new QrSvgRenderer(data).render()
   ```

## File Structure

```text
QR-Atelier/
|-- index.html
|-- package.json
|-- styles.css
|-- app.js
`-- libs/
    |-- QrCore.js
    `-- QrSvg.js
```

## Contributing

Ideas for new barcode styles, broader QR support, or UI improvements are welcome. The experimental 2D barcode work lives in the feature branches listed above, while `main` stays focused on QR Code.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
