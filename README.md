# 🎨 QR-Atelier

> **Generate sharp QR codes with a browser-native studio, not a bloated toolchain.**

🇩🇪 *Lies die deutsche Version hier:* [README_de.md](README_de.md)

A minimalist, performant, and **completely dependency-free** QR code generator. QR-Atelier cleanly separates the complex QR matrix logic from the aesthetic SVG rendering. Everything runs directly in the browser – no build steps, no bundlers, and no framework overhead.

🔗 **Repository:** [https://github.com/Streetblock/QR-Atelier](https://github.com/Streetblock/QR-Atelier)

---

## ✨ Features

* **Zero Dependencies:** No `npm`, no Webpack, no framework. Just pure ES6 Vanilla JavaScript, modern HTML, and CSS.
* **Live Preview:** The QR code is instantly and efficiently re-rendered on every input (URL/text, colors, styles) thanks to built-in debouncing.
* **In-depth Styling:** Choose between various dot styles (Rounded, Classy, Diamond, etc.), finder shapes, and create smooth SVG color gradients.
* **Center Logo Support:** Upload your own logo. The studio app automatically switches to error correction level H in the background.
* **Local Export:** Direct download of the result as a vector (`SVG`) or raster image (`PNG` up to 2048x2048px).
* **URL Parameters:** Populate the studio directly via URL parameters: `?url=https://your-link.com`.

---

## 🧠 Architecture & Library Scope

The project is highly modular and demonstrates how far you can get with two dedicated, small plain-JS classes:

### 1. `QRcore.js` (The Left Brain)
The mathematical core. Generates the matrix database of the QR code.
* Creates codewords via Reed-Solomon error correction.
* Supports Numeric, Alphanumeric, and Byte mode plus ECI for UTF-8, ISO-8859-1, and Windows-1252. QR Kanji mode is not currently supported.
* Uses UTF-8 as the default Byte-mode encoding; library consumers can select another supported encoding through `QrCore` options.
* Automatically selects a bit-efficient combination of Numeric, Alphanumeric, and Byte segments for each QR version range.
* Automatically selects the best mask pattern.
* Supports QR versions 1 through 40.

### 2. `QRsvg.js` (The Right Brain)
The SVG renderer. Takes the raw matrix from `QrCore` and turns it into visual art.
* Calculates complex SVG paths for rounded corners and special "Classy" styles.
* Draws finder patterns, places logos, and applies defined gradients.

### Data Matrix ECC 200
`DmCore` generates dependency-free Data Matrix ECC 200 symbols and `DmSvgRenderer` renders their matrices.

* Supports all 24 classic square sizes from 10x10 through 144x144.
* Supports the six classic rectangular sizes: 8x18, 8x32, 12x26, 12x36, 16x36, and 16x48.
* Dynamically selects among ASCII, C40, Text, ANSI X12, EDIFACT, and Base256 encodation to minimize the required symbol.
* Allows automatic, square-only, rectangle-only, constrained, or exact-size selection through `DmCore` options.
* Uses the ECC 200 error-correction structure fixed by the selected symbol; Data Matrix does not expose a variable QR-style ECC level.
* Currently accepts ISO-8859-1 input. GS1/FNC1, ECI, Structured Append, Macro 05/06, and DMRE sizes are not yet exposed.

### 3. `app.js` & `styles.css` (The Stage)
The app controller and UI. Manages state, binds DOM events to the classes, and provides the modern, glassmorphism interface. The studio currently uses the core's UTF-8 default and does not expose an encoding selector. When a center logo is present, the app requests error correction level H; this is app behavior, not an automatic rule inside `QrCore`.

---

## 🚀 Installation & Usage

Since this project requires no build tools, setup is done in seconds:

1. **Clone the repository**
   ```bash
   git clone https://github.com/Streetblock/QR-Atelier.git
   cd QR-Atelier
   ```

2. **Start a local server**
   Since ES6 modules (`import`/`export`) are used, the project must be served via a local web server (opening `index.html` directly via `file://` is blocked by browsers for security reasons).

   *Using VS Code?*
   Simply start the **Live Server** extension.

   *Using Python?*
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

---

## 📂 File Structure

```text
QR-Atelier/
├── index.html       # The markup (UI)
├── styles.css       # The styling (Custom Properties, Gradients)
├── app.js           # Main App Controller (DOM Events, State, Downloads)
└── libs/
    ├── QRcore.js    # Logic Module: Generates the raw QR Matrix
    └── QRsvg.js     # Render Module: Translates the matrix into SVG paths
```

---

## 🤝 Contributing

Do you have ideas for new dot styles, broader QR support, or want to improve the interface?
Pull Requests are highly welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*Designed for everyone who loves clean code and crisp vector graphics.*
