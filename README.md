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
* **Center Logo Support:** Upload your own logo. The system automatically switches to error correction level 'H' (High) in the background to guarantee readability.
* **Local Export:** Direct download of the result as a vector (`SVG`) or raster image (`PNG` up to 2048x2048px).
* **URL Parameters:** Populate the studio directly via URL parameters: `?url=https://your-link.com`.

---

## 🧠 Architecture & Library Scope

The project is highly modular and demonstrates how far you can get with two dedicated, small plain-JS classes:

### 1. `QrCore.js` (The Left Brain)
The mathematical core. Generates the matrix database of the QR code.
* Creates codewords via Reed-Solomon error correction.
* Automatically selects the best mask pattern.
* Supports version 1 through 10 (Byte-Mode) for compact to medium-length URLs.

### 2. `QrSvg.js` (The Right Brain)
The SVG renderer. Takes the raw matrix from `QrCore` and turns it into visual art.
* Calculates complex SVG paths for rounded corners and special "Classy" styles.
* Draws finder patterns, places logos, and applies defined gradients.

### 3. `app.js` & `styles.css` (The Stage)
The app controller and UI. Manages state, binds DOM events to the classes, and provides the modern, glassmorphism interface.

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
└── lib/
    ├── QrCore.js    # Logic Module: Generates the raw QR Matrix
    └── QrSvg.js     # Render Module: Translates the matrix into SVG paths
```

---

## 🤝 Contributing

Do you have ideas for new dot styles, want to add support for higher QR versions (11-40) in `QrCore.js`, or want to improve the interface? 
Pull Requests are highly welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*Designed for everyone who loves clean code and crisp vector graphics.*