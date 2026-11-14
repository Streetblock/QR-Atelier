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

## Shared binary Reed-Solomon arithmetic

QR Model 1/2, Micro QR, rMQR, Data Matrix ECC200/DMRE and Aztec (including Rune)
use one private binary-field RS module under
`libs/internal/`. The public encoder APIs, encoding defaults, masks, codewords,
matrices and returned metadata remain unchanged. Package exports intentionally
deny direct imports of this internal module; it is not a public math API.

The internal fixed field presets distinguish QR's GF(256) polynomial
`0x11d` / generator start 0 from Data Matrix/Aztec-8's `0x12d` / start 1.
Aztec data words use the existing 6/8/10/12-bit fields; its mode messages and
Rune use the 4-bit field. Data Matrix retains its classic/DMRE block and special
144-by-144 interleaving rules. MaxiCode retains its existing arithmetic during
this migration stage. PDF417's prime-field helper and Legacy Data Matrix's CRC/convolution
pipeline are separate. Format-specific framing and interleaving stay in each
encoder rather than moving into the shared arithmetic module.

The shared implementation initializes field tables lazily and caches only
requested exact generator degrees. Each of its six possible field states
retains at most eight generator entries and 8192 coefficient words, without a
chain of every lower-degree polynomial.

`tests/fixtures/encoder-baseline-372f456.json` preserves 753 complete public
results from the previous unified implementation at commit
`372f456f7f42d980732681f86c3827f2a0b37aec`. Hashes cover matrices, word/bit
fields, all other metadata and typed-array identities. This is explicitly a
previous-output regression baseline, not independent standards proof; its
expectations are not regenerated during tests. All affected and untouched
families participate, including all 256 Aztec Runes and large forced symbols.

Direct RS tests also compare deterministic/seeded vectors with a separate
test-only polynomial oracle and the existing ZXing development encoder,
including pinned known vectors and full-layer-32 Aztec parity degrees. These
references add no production dependency. Existing external family reference
tests remain the independent encoding evidence.
