# QR-Atelier

> Generate sharp 2D barcodes with a browser-native studio, not a bloated toolchain.

[Read the English version here](README.md)

QR-Atelier ist ein minimalistisches, performantes und komplett dependency-freies QR-Code-Studio. Das Projekt trennt die Matrix-Logik sauber von der SVG-Darstellung. Alles laeuft direkt im Browser - ohne Build-Steps, ohne Bundler und ohne Framework-Overhead.

Auf `main` liegt der Fokus auf QR Code. Weitere 2D-Barcode-Familien leben in Feature-Branches:
* `feat/aztec-code`
* `feat/datamatrix`
* `feat/micro-qr-core`
* `feat/maxi-code`

Repository: [https://github.com/Streetblock/QR-Atelier](https://github.com/Streetblock/QR-Atelier)

## Features

* Zero Dependencies: Kein `npm`, kein Webpack, kein Framework. Nur reines ES6 Vanilla JavaScript, modernes HTML und CSS.
* Live Preview: Der ausgewaehlte Barcode wird bei jeder Eingabe dank integriertem Debouncing sofort und performant neu gerendert.
* QR-Code-Studio: Der Main-Branch liefert die QR-Code-Erfahrung.
* Tiefgehendes Styling: Waehle zwischen verschiedenen Dot-Styles, Finder-Formen und weichen SVG-Farbverlaeufen.
* Center Logo Support: Lade ein eigenes Logo fuer QR Code hoch. Das System wechselt im Hintergrund automatisch auf das Fehlerkorrektur-Level H.
* Lokaler Export: Direkter Download des Ergebnisses als Vektor (`SVG`) oder Rastergrafik (`PNG` bis zu 2048x2048px).
* URL-Parameter: Fuelle das Studio direkt ueber die URL ab: `?url=https://dein-link.de`.

## Architektur & Library Scope

Das Projekt bleibt bewusst klein und nutzt pro Barcode-Familie ein Kern- und ein Render-Modul:

### 1. `QrCore.js` und `QrSvg.js`
Der QR-Code-Kern und Renderer.
* Generiert QR-Matrizen mit Reed-Solomon Fehlerkorrektur.
* Waehlt automatisch die beste Maskierung.
* Rendert die QR-Matrix im gewaehlten Stil.

### 2. `app.js` und `styles.css`
Der App-Controller und das UI. Steuert den State, bindet DOM-Events und sorgt fuer das Interface.

## Installation & Nutzung

1. Repository klonen
   ```bash
   git clone https://github.com/Streetblock/QR-Atelier.git
   cd QR-Atelier
   ```

2. Lokalen Server starten
   Da ES6-Module (`import`/`export`) verwendet werden, muss das Projekt ueber einen lokalen Webserver aufgerufen werden. Das direkte Oeffnen von `index.html` via `file://` wird von Browsern aus Sicherheitsgruenden blockiert.

   Mit VS Code einfach die Erweiterung Live Server starten.

   Mit Python:
   ```bash
   python3 -m http.server 8000
   ```
   Danach `http://localhost:8000` im Browser oeffnen.

## Dateistruktur

```text
QR-Atelier/
|-- index.html
|-- styles.css
|-- app.js
`-- libs/
    |-- QrCore.js
    `-- QrSvg.js
```

## Mitwirken

Ideen fuer neue Barcode-Styles, mehr QR-Unterstuetzung oder UI-Verbesserungen sind willkommen. Die experimentelle 2D-Barcode-Arbeit lebt in den Feature-Branches oben, waehrend `main` auf QR Code fokussiert bleibt.

1. Forke das Projekt
2. Erstelle deinen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Aenderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushe in den Branch (`git push origin feature/AmazingFeature`)
5. Oeffne einen Pull Request
