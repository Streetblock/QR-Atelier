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
* Center Logo Support: Lade ein eigenes Logo fuer QR Code hoch. Die Studio-App wechselt im Hintergrund automatisch auf das Fehlerkorrektur-Level H.
* Lokaler Export: Direkter Download des Ergebnisses als Vektor (`SVG`) oder Rastergrafik (`PNG` bis zu 2048x2048px).
* URL-Parameter: Fuelle das Studio direkt ueber die URL ab: `?url=https://dein-link.de`.

## Architektur & Library Scope

Das Projekt bleibt bewusst klein und nutzt pro Barcode-Familie ein Kern- und ein Render-Modul:

### 1. `QRcore.js` und `QRsvg.js`
Der QR-Code-Kern und Renderer.
* Generiert QR-Matrizen mit Reed-Solomon Fehlerkorrektur.
* Unterstuetzt standardmaessig QR Code Model 2 in den Versionen 1-40 und ueber die Option `model: 1` den Legacy-Modus QR Code Model 1 in den Versionen 1-2.
* Unterstuetzt Numeric-, Alphanumeric- und Byte-Modus sowie ECI fuer UTF-8, ISO-8859-1 und Windows-1252. Der QR-Kanji-Modus wird gegenwaertig nicht unterstuetzt.
* Verwendet UTF-8 als Standardkodierung im Byte-Modus; Nutzer der Library koennen ueber die `QrCore`-Optionen eine andere unterstuetzte Kodierung waehlen.
* Waehlt fuer jeden QR-Versionsbereich automatisch eine biteffiziente Kombination aus Numeric-, Alphanumeric- und Byte-Segmenten.
* Unterstuetzt QR Structured Append zum Aufteilen einer Nachricht auf 2 bis 16 Symbole, einschliesslich des standardisierten Sequenz- und Paritaets-Headers.
* Waehlt automatisch die beste Maskierung.
* Rendert die QR-Matrix im gewaehlten Stil.

### 2. `app.js` und `styles.css`
Der App-Controller und das UI. Steuert den State, bindet DOM-Events und sorgt fuer das Interface. Das Studio bietet Model 2 und den begrenzten Model-1-Legacy-Modus an, nutzt den UTF-8-Standard des Kerns und bietet keine Auswahl der Kodierung an. Wenn ein Center-Logo vorhanden ist, fordert die App das Fehlerkorrektur-Level H an; dies ist App-Verhalten und keine automatische Regel innerhalb von `QrCore`.

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

3. Die Libs in Node.js nutzen
   Mit dem ESM-Setup des Repos koennen die Barcode-Libs auch direkt in Node importiert werden:
   ```js
   import { QrCore } from './libs/QRcore.js'
   import { QrSvgRenderer } from './libs/QRsvg.js'

   const data = new QrCore('https://example.com').generate()
   const svg = new QrSvgRenderer(data).render()

   const legacyData = new QrCore('LEGACY', { model: 1, maxVersion: 2 }).generate()
   ```

   Model 1 lehnt ECI-Segmente bewusst ab. Fuer neue Anwendungen bleibt Model 2 der Standard.

4. Eine Nachricht mit QR Structured Append aufteilen
   ```js
   import { QrCore, calculateQrStructuredAppendParity } from './libs/QRcore.js'

   const completeMessage = 'EINE NACHRICHT IN ZWEI SYMBOLEN'
   const parts = ['EINE NACHRICHT ', 'IN ZWEI SYMBOLEN']
   const parity = calculateQrStructuredAppendParity(completeMessage)

   const symbols = parts.map((part, index) => new QrCore(part, {
     structuredAppend: {
       position: index + 1,
       total: parts.length,
       parity,
     },
   }).generate())
   ```

   Die Paritaet wird aus der vollstaendigen, noch nicht aufgeteilten Nachricht mit derselben Byte-Kodierung wie die QR-Daten berechnet. Wie die Nachricht aufgeteilt wird, entscheidet die Anwendung.

## Dateistruktur

```text
QR-Atelier/
|-- package.json
|-- index.html
|-- styles.css
|-- app.js
`-- libs/
    |-- QRcore.js
    `-- QRsvg.js
```

## Mitwirken

Ideen fuer neue Barcode-Styles, mehr QR-Unterstuetzung oder UI-Verbesserungen sind willkommen. Die experimentelle 2D-Barcode-Arbeit lebt in den Feature-Branches oben, waehrend `main` auf QR Code fokussiert bleibt.

1. Forke das Projekt
2. Erstelle deinen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Aenderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushe in den Branch (`git push origin feature/AmazingFeature`)
5. Oeffne einen Pull Request
