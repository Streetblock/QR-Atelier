# QR-Atelier

> Generate sharp 2D barcodes with a browser-native studio, not a bloated toolchain.

[Read the English version here](README.md)

QR-Atelier ist ein minimalistisches, performantes und komplett dependency-freies QR-Code-Studio. Das Projekt trennt die Matrix-Logik sauber von der SVG-Darstellung. Alles laeuft direkt im Browser - ohne Build-Steps, ohne Bundler und ohne Framework-Overhead.

Auf `main` liegt der Fokus auf QR Code. Weitere 2D-Barcode-Familien leben in Feature-Branches:
* `feat/aztec-code`
* `feat/datamatrix`
* `feat/datamatrix-legacy`
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

## Data Matrix ECC 000-140 (dieser Branch)

Dieser Branch enthaelt einen experimentellen, dependency-freien Encoder-Core
fuer die historische Data-Matrix-Familie ECC 000, ECC 050, ECC 080, ECC 100
und ECC 140. Er bleibt bewusst vom modernen ECC-200- und DMRE-Core getrennt.
Der Legacy-Encoder stellt derzeit eine JavaScript-API fuer Browser und Node.js
bereit; in die Studio-Oberflaeche ist er noch nicht integriert.

```js
import { generateLegacyDataMatrix } from './libs/DMlegacy.js'

const symbol = generateLegacyDataMatrix('A', {
  ecc: 80,
  format: 6,
  symbolSize: 13,
})
```

Die fuenf Werte sind waehlbare Schutzstufen derselben historischen
Symbolfamilie und keine fuenf aufeinanderfolgenden Data-Matrix-Generationen:

* ECC 000 nutzt die historische CRC- und Platzierungs-Pipeline ohne
  korrigierende Faltungscode-Redundanz.
* ECC 050, 080, 100 und 140 fuegen zunehmend mehr Fehlerkorrektur durch
  Faltungscodes hinzu. Hoehere Stufen verringern die Nutzdatenkapazitaet einer
  gegebenen Symbolgroesse.
* Legacy-Symbole sind quadratisch, verwenden ungerade Groessen von 9x9 bis
  49x49 und unterstuetzen sechs historische Datenformat-IDs.
* ECC 200 ist eine andere Konstruktion: Reed-Solomon-Fehlerkorrektur, gerade
  Symbolgroessen sowie moderne quadratische und rechteckige Formate.

### Standardhistorie und Kompatibilitaetszweck

Data Matrix entstand vor seiner ISO-Standardisierung. 1996 ergaenzte das AIM
Technical Symbology Committee ECC 200 und veroeffentlichte die verbesserte
Symbologie als AIM-Standard. ISO/IEC 16022:2000 und ISO/IEC 16022:2006
beschrieben anschliessend sowohl ECC 000-140 als auch ECC 200. Die dritte
Ausgabe ISO/IEC 16022:2024 entfernte die historische Variante ECC 000-140
ausdruecklich aus dem Standard.

Diese Implementierung dient deshalb der Legacy-Interoperabilitaet, der
Archivforschung, Konformitaetstests fuer Encoder und Decoder sowie der
originalgetreuen Wiedergabe bestehender Symbole. Sie ist keine Empfehlung,
neue Anwendungen auf Legacy-ECC aufzubauen; aktuelle Anwendungen sollten ECC
200 verwenden.

Die vollstaendige Encoder-Pipeline wurde fuer alle fuenf ECC-Stufen mit
Format-ID 6 modulgenau gegen eine physisch unabhaengige Implementierung
geprueft. Alle 933 Module der getesteten Symbole stimmten ueberein. Details zur
Implementierung und zu den Quellen stehen in
[`docs/formats/datamatrix-legacy.md`](docs/formats/datamatrix-legacy.md) und
[`docs/formats/datamatrix-legacy-implementation-spec.md`](docs/formats/datamatrix-legacy-implementation-spec.md).

Quellen:

* [AIM-Historie: ECC 200 wurde 1996 ergaenzt und veroeffentlicht](https://www.aimglobal.org/aim-1990/)
* [ISO/IEC 16022:2000](https://www.iso.org/standard/29833.html)
* [ISO/IEC 16022:2024](https://www.iso.org/standard/80926.html)

## Architektur & Library Scope

Das Projekt bleibt bewusst klein und nutzt pro Barcode-Familie ein Kern- und ein Render-Modul:

### 1. `QRcore.js` und `QRsvg.js`
Der QR-Code-Kern und Renderer.
* Generiert QR-Matrizen mit Reed-Solomon Fehlerkorrektur.
* Unterstuetzt Numeric-, Alphanumeric- und Byte-Modus sowie ECI fuer UTF-8, ISO-8859-1 und Windows-1252. Der QR-Kanji-Modus wird gegenwaertig nicht unterstuetzt.
* Verwendet UTF-8 als Standardkodierung im Byte-Modus; Nutzer der Library koennen ueber die `QrCore`-Optionen eine andere unterstuetzte Kodierung waehlen.
* Waehlt fuer jeden QR-Versionsbereich automatisch eine biteffiziente Kombination aus Numeric-, Alphanumeric- und Byte-Segmenten.
* Waehlt automatisch die beste Maskierung.
* Rendert die QR-Matrix im gewaehlten Stil.

### 2. `app.js` und `styles.css`
Der App-Controller und das UI. Steuert den State, bindet DOM-Events und sorgt fuer das Interface. Das Studio nutzt derzeit den UTF-8-Standard des Kerns und bietet keine Auswahl der Kodierung an. Wenn ein Center-Logo vorhanden ist, fordert die App das Fehlerkorrektur-Level H an; dies ist App-Verhalten und keine automatische Regel innerhalb von `QrCore`.

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
   ```

## Dateistruktur

```text
QR-Atelier/
|-- package.json
|-- index.html
|-- styles.css
|-- app.js
`-- libs/
    |-- DMlegacy.js
    |-- DMlegacyPlacement.js
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
