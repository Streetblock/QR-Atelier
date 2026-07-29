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
* **Center Logo Support:** Lade ein eigenes Logo hoch. Die Studio-App wechselt im Hintergrund automatisch auf das Fehlerkorrektur-Level H.
* **Lokaler Export:** Direkter Download des Ergebnisses als Vektor (`SVG`) oder Rastergrafik (`PNG` bis zu 2048x2048px).
* **URL-Parameter:** Fülle das Studio direkt über die URL ab: `?url=https://dein-link.de`.

---

## 🧠 Architektur & Library Scope

Das Projekt ist modular aufgebaut und demonstriert, wie weit man mit zwei dedizierten, kleinen Plain-JS-Klassen kommt:

### 1. `QRcore.js` (Die linke Gehirnhälfte)
Der mathematische Kern. Generiert die Matrix-Datenbank des QR-Codes.
* Erstellt die Codewords via Reed-Solomon Fehlerkorrektur.
* Unterstützt Numeric-, Alphanumeric- und Byte-Modus sowie ECI für UTF-8, ISO-8859-1 und Windows-1252. Der QR-Kanji-Modus wird gegenwärtig nicht unterstützt.
* Verwendet UTF-8 als Standardkodierung im Byte-Modus; Nutzer der Library können über die `QrCore`-Optionen eine andere unterstützte Kodierung wählen.
* Wählt für jeden QR-Versionsbereich automatisch eine biteffiziente Kombination aus Numeric-, Alphanumeric- und Byte-Segmenten.
* Wählt automatisch die beste Maskierung (Mask Pattern).
* Unterstützt die QR-Versionen 1 bis 40.

### 2. `QRsvg.js` (Die rechte Gehirnhälfte)
Der SVG-Renderer. Nimmt die rohe Matrix von `QrCore` und verwandelt sie in visuelle Kunst.
* Berechnet komplexe SVG-Pfade für abgerundete Ecken und spezielle "Classy"-Styles.
* Zeichnet Finder-Patterns, platziert Logos und wendet definierte Gradients an.

### Data Matrix ECC 200
`DmCore` erzeugt Data-Matrix-ECC-200-Symbole ohne Laufzeitabhängigkeiten; `DmSvgRenderer` rendert die resultierende Matrix.

* Unterstützt alle 24 klassischen quadratischen Größen von 10x10 bis 144x144.
* Unterstützt die sechs klassischen Rechtecke: 8x18, 8x32, 12x26, 12x36, 16x36 und 16x48.
* Wählt dynamisch zwischen ASCII, C40, Text, ANSI X12, EDIFACT und Base256, um das kleinste passende Symbol zu finden.
* Erlaubt automatische, nur quadratische, nur rechteckige, begrenzte oder exakt vorgegebene Größen über die `DmCore`-Optionen.
* Verwendet die durch die Symbolgröße festgelegte ECC-200-Fehlerkorrektur; ein variables QR-artiges ECC-Level gibt es bei Data Matrix nicht.
* Verwendet standardmäßig UTF-8 und setzt bei nicht-ASCII-Daten ECI-Zuweisung 26; ISO-8859-1 bleibt über die Option `encoding` verfügbar.
* GS1/FNC1, Structured Append, Macro 05/06 und DMRE-Größen sind noch nicht verfügbar.

### 3. `app.js` & `styles.css` (Die Bühne)
Der App-Controller und das UI. Steuert den State, bindet DOM-Events an die Klassen an und sorgt für das moderne, glasartige (Glassmorphism) Interface. Das Studio nutzt derzeit den UTF-8-Standard des Kerns und bietet keine Auswahl der Kodierung an. Wenn ein Center-Logo vorhanden ist, fordert die App das Fehlerkorrektur-Level H an; dies ist App-Verhalten und keine automatische Regel innerhalb von `QrCore`.

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
└── libs/
    ├── QRcore.js    # Logik-Modul: Generiert die rohe QR Matrix
    └── QRsvg.js     # Render-Modul: Übersetzt Matrix in SVG-Pfade
```

---

## 🤝 Contributing

Du hast Ideen für neue Dot-Styles, breitere QR-Unterstützung oder möchtest das Interface verbessern?
Pull Requests sind herzlich willkommen!

1. Forke das Projekt
2. Erstelle deinen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushe in den Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

---

*Entworfen für alle, die sauberen Code und scharfe Vektorgrafiken lieben.*
