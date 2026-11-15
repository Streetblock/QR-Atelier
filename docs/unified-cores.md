# Integrated encoder package

`feat/unified-barcode-cores` contains the shared independent encoder set. Main retains its separate previous scope. Family feature branches and their focused documents remain available for development history. The package remains private; this integration does not broaden the grants in LICENSE.md or publish it to a registry.

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

QR Model 1/2, Micro QR, rMQR, Data Matrix ECC200/DMRE, Aztec (including Rune)
and MaxiCode use one private binary-field RS module under
`libs/internal/`. The public encoder APIs, encoding defaults, masks, codewords,
and returned metadata remain unchanged by arithmetic extraction. The explicit
Model 1 correction below supersedes the affected prior matrices. Package exports intentionally
deny direct imports of this internal module; it is not a public math API.

The internal fixed field presets distinguish QR's GF(256) polynomial
`0x11d` / generator start 0 from Data Matrix/Aztec-8's `0x12d` / start 1.
Aztec data words use the existing 6/8/10/12-bit fields; its mode messages and
Rune use the 4-bit field. Data Matrix retains its classic/DMRE block and special
144-by-144 interleaving rules. MaxiCode uses the same GF(64) preset as Aztec-6
while retaining its primary/even/odd streams and Uint8Array codewords.
PDF417's prime-field helper and Legacy Data Matrix's CRC/convolution
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

## Explicit native compatibility controls

QR callers may opt into `includeMaskMetadata` to obtain the selected `mask`.
Default result objects keep their previous fields. A trusted
`maskPenaltyEvaluator` can score each complete automatic-mask candidate; scores
must be finite and nonnegative. `maskScoringRemainder: 'legacy-null'` retains
historical nullable remainder cells during scoring for existing device profiles.
The default remains actual light remainder modules and the ISO scorer. Explicit
masks bypass scoring. Returned module grids always contain booleans.

Data Matrix raw byte arrays with `eci: null` retain exact bytes without an
implicit ECI. `specialCodewords` is a map or numeric-keyed record whose values
contain codewords 1 through 254. Each offset must identify an explicit zero-byte
placeholder. The caller owns protocol interpretation; these markers cannot be
combined with semantic `segments`. The optional `modes` allowlist restricts
compaction choices; ASCII remains available, and an empty list selects only
ASCII. `rows` and `columns` independently constrain symbol dimensions; zero or
null means automatic. Capacity, shape, marker and byte validation remain active.

Native multi-codeword markers after EDIFACT count their complete ASCII cost
before an implicit unlatch is allowed. A regression that previously decoded an
ECI tail as extra text is covered by exact independent text and byte readback,
at the same symbol dimensions. An explicit terminal PAD starts padding once.

Model 1 versions 7 through 14 must not reserve Model 2 version-information
regions. The consumer migration corrects that historical feature-branch error
to match the existing Toolkit native path. The original 753-result fixture is
immutable; a separate versioned correction fixture qualifies the 32 affected
Model 1 requests, while the other prior results remain strict regression checks.
This establishes compatibility with the previous Toolkit path, not new
independent qualification for every Model 1 version. The ZXing-C++ 3.1.0
reference detector assumes Model 2 version information from version 7 onward;
pure-symbol readback bypasses that detector limitation. Its Model 1 codeword
reader also has a separate count mismatch for versions 13 and 14. These
reference limitations do not relax any production acceptance checks.
