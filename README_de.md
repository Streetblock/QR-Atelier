# 🎨 QR-Atelier

> **Generate sharp QR codes with a browser-native studio, not a bloated toolchain.**

🇬🇧 *Read the English version here:* [README.md](README.md)

Ein minimalistischer, performanter und **komplett dependency-freier** QR-Code-Generator. Das QR-Atelier trennt die komplexe QR-Matrix-Logik sauber von der ästhetischen SVG-Darstellung. Alles läuft direkt im Browser – ohne Build-Steps, ohne Bundler und ohne Framework-Overhead.

🔗 **Repository:** [https://github.com/Streetblock/QR-Atelier](https://github.com/Streetblock/QR-Atelier)

---

## ✨ Features

* **Zero Dependencies:** Kein `npm`, kein Webpack, kein Framework. Nur reines ES6 Vanilla JavaScript, modernes HTML und CSS.
* **Live Preview:** Der QR-Code wird bei jeder Eingabe (URL/Text, Farben, Styles) dank integriertem Debouncing sofort und performant neu gerendert.
* **Tiefgehendes Styling:** Wähle zwischen verschiedenen Dot-Styles (Rounded, Classy, Diamond, etc.), Finder-Formen und erstelle fließende SVG-Farbverläufe.
* **Center Logo Support:** Lade ein eigenes Logo hoch. Das System wechselt im Hintergrund automatisch auf das Fehlerkorrektur-Level 'H' (High), um die Lesbarkeit zu garantieren.
* **Lokaler Export:** Direkter Download des Ergebnisses als Vektor (`SVG`) oder Rastergrafik (`PNG` bis zu 2048x2048px).
* **URL-Parameter:** Fülle das Studio direkt über die URL ab: `?url=https://dein-link.de`.

---

## 🧠 Architektur & Library Scope

Das Projekt ist modular aufgebaut und demonstriert, wie weit man mit zwei dedizierten, kleinen Plain-JS-Klassen kommt:

### 1. `QrCore.js` (Die linke Gehirnhälfte)
Der mathematische Kern. Generiert die Matrix-Datenbank des QR-Codes.
* Erstellt die Codewords via Reed-Solomon Fehlerkorrektur.
* Wählt automatisch die beste Maskierung (Mask Pattern).
* Unterstützt Version 1 bis 10 (Byte-Mode) für kompakte bis mittellange URLs.

### 2. `QrSvg.js` (Die rechte Gehirnhälfte)
Der SVG-Renderer. Nimmt die rohe Matrix von `QrCore` und verwandelt sie in visuelle Kunst.
* Berechnet komplexe SVG-Pfade für abgerundete Ecken und spezielle "Classy"-Styles.
* Zeichnet Finder-Patterns, platziert Logos und wendet definierte Gradients an.

### 3. `app.js` & `styles.css` (Die Bühne)
Der App-Controller und das UI. Steuert den State, bindet DOM-Events an die Klassen an und sorgt für das moderne, glasartige (Glassmorphism) Interface.

---

## 🚀 Installation & Nutzung

Da dieses Projekt keine Build-Werkzeuge benötigt, ist das Setup in Sekunden erledigt:

1. **Repository klonen**
   ```bash
   git clone https://github.com/Streetblock/QR-Atelier.git
   cd QR-Atelier
   ```

2. **Lokalen Server starten**
   Da ES6-Module (`import`/`export`) verwendet werden, muss das Projekt über einen lokalen Webserver aufgerufen werden (das direkte Öffnen der `index.html` über `file://` wird von Browsern aus Sicherheitsgründen blockiert).

   *Nutzt du VS Code?*
   Starte einfach die Erweiterung **Live Server**.

   *Nutzt du Python?*
   ```bash
   python3 -m http.server 8000
   ```
   Öffne danach `http://localhost:8000` im Browser.

---

## 📂 Dateistruktur

```text
QR-Atelier/
├── index.html       # Das Markup (UI)
├── styles.css       # Das Styling (Custom Properties, Gradients)
├── app.js           # Main App Controller (DOM Events, State, Downloads)
└── lib/
    ├── QrCore.js    # Logik-Modul: Generiert die rohe QR Matrix
    └── QrSvg.js     # Render-Modul: Übersetzt Matrix in SVG-Pfade
```

---

## 🤝 Contributing

Du hast Ideen für neue Dot-Styles, möchtest die Unterstützung für höhere QR-Versionen (11-40) in `QrCore.js` einbauen oder das Interface verbessern? 
Pull Requests sind herzlich willkommen!

1. Forke das Projekt
2. Erstelle deinen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushe in den Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

---

*Entworfen für alle, die sauberen Code und scharfe Vektorgrafiken lieben.*