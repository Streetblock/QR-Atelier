# Integrated encoder package

Main contains the unified independent encoder set. Family feature branches and their focused documents remain available for development history. The package remains private; this integration does not broaden the grants in LICENSE.md or publish it to a registry.

## Public imports

```js
import { QrCore } from 'qr-atelier/qr';
import { DmCore } from 'qr-atelier/data-matrix';
import { DmSvgRenderer } from 'qr-atelier/renderers/data-matrix';
const symbol = new DmCore('Example', { shape: 'square' }).generate();
const svg = new DmSvgRenderer(symbol).render();
```

- `qr`: QR Model 1/2, explicit segments and structured-append parity.
- `microqr` and `rmqr`: their independent cores and rMQR segment helpers.
- `data-matrix`: ECC200 and explicit DMRE, raw bytes and ECI segments.
- `legacy-data-matrix`: the separate ECC000/050/080/100/140 API.
- `aztec` and `aztec-rune`: separate encoders.
- `maxicode`: MaxiCode plus the existing raw-input and UPS helpers.
- `pdf417`: PDF417/MicroPDF417 and compaction helpers.
- `renderers` and `renderers/{qr,microqr,data-matrix,aztec,maxicode}`: optional SVG output.

The root preserves its existing runtime exports. `./cores` is now deliberately encoder-only. Existing `./libs/*` and `./formats` paths remain supported. ESM is the implementation format; no CommonJS copy is generated. Public declaration files describe the actual family options and result shapes without requiring DOM or Node declarations. Numeric capacity/version limits still have runtime checks.

## Boundaries and compatibility

Family subpaths avoid loading unused encoder tables. A root barrel import can still retain unrelated module initialization; no global `sideEffects:false` assertion is made. The pure cores entry excludes SVG renderers, while the compatibility root includes them. Core code has no production dependencies. TypeScript/esbuild and the independent decoder are development/test tools only.

Packaging does not change encoding defaults, charset/ECI behavior, masks, codewords or matrices. Consumers such as Toolkit retain their explicit literal-byte, GS1, ZPL and device qualification adapters. Replacing an adapted encoder requires its own compatibility proof; a package import alone does not establish printer behavior.

The archive allowlist contains library/formats code, declarations, this contract, README files and the existing license/notice files. Studio HTML/CSS/app code, examples, reference environments and test fixtures are not library payload.

## Verification

Run `npm test` and the existing `npm run test:reference` for encoder behavior. `npm run test:types` checks positive and negative public API cases. `npm run test:package` packs with lifecycle scripts disabled, installs only the local zero-dependency artifact into a fresh bounded consumer, checks the exports, compiles the public types and measures a write-free browser bundle. No test downloads an oracle or installs tools.

CI uses the pinned development tools. Local verification may set `QR_ATELIER_TOOLING_ROOT` to an existing package with the same TypeScript/esbuild versions. `QR_ATELIER_TEST_TMP_ROOT` may select a workspace output directory for the temporary packed consumer; otherwise it is under this checkout's ignored output directory. Temporary consumers are removed after verification.
