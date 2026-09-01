# Unified barcode core surface

The branch `feat/unified-barcode-cores` collects the independently usable encoder cores developed on the family branches. It does not combine their algorithms into one stateful super-encoder. Each family remains a separate ES module and can still be imported directly.

## Stable imports

Consumers that need several families should use the package root or the equivalent `cores` subpath:

```js
import {
  QrCore,
  MicroQrCore,
  RMqrCore,
  DmCore,
  AztecCore,
  MaxiCodeCore,
  Pdf417Core,
  MicroPdf417Core,
} from 'qr-atelier'
```

Direct imports remain supported for small consumers and backwards compatibility:

```js
import { DmCore } from 'qr-atelier/libs/DMcore.js'
import { AztecCore } from 'qr-atelier/libs/AztecCore.js'
```

The root surface also exports the legacy Data Matrix generator, structured control helpers, UPS MaxiCode helpers and the family SVG renderers. Internal placement tables and low-level error-correction implementation details are deliberately not all promoted to the stable root API.

## Included families

| Family | Core | Notes |
| --- | --- | --- |
| QR Code | `QrCore` | Model 2 versions 1–40; legacy Model 1 versions 1–14 |
| Micro QR | `MicroQrCore` | M1–M4 |
| rMQR | `RMqrCore` | all 32 standard sizes, ECI and FNC1 modes |
| Data Matrix | `DmCore` | ECC 200, classic rectangles, DMRE, ECI and structured controls |
| Legacy Data Matrix | `generateLegacyDataMatrix` | ECC 000/050/080/100/140 compatibility |
| Aztec | `AztecCore` | compact and full symbols |
| MaxiCode | `MaxiCodeCore` | modes 2–6, ECI, Structured Append and UPS Format 07 helpers |
| PDF417 | `Pdf417Core` | standard and truncated layouts |
| MicroPDF417 | `MicroPdf417Core` | all 34 standardized variants |

## Boundaries

- Encoder cores are DOM- and Canvas-free.
- SVG renderers are optional presentation modules and do not change the matrix returned by a core.
- The browser studio uses `formats/index.js`; this registry is a demo/authoring adapter, not the encoder API.
- Optional ZXing, Segno, Zint and BWIPP comparisons remain reference-test dependencies only.
- Family feature branches remain useful for focused development. This integration branch is the consumption point for applications that need several families at once.
