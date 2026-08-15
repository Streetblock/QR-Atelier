# Han Xin core

`HanXinCore` is a browser-native, dependency-free Han Xin Code encoder modeled
on ISO/IEC 20830:2021. The core returns an unscaled boolean matrix; rendering is
kept separate.

## Usage

```js
import { HanXinCore } from '../libs/HanXinCore.js'
import { HanXinSvgRenderer } from '../libs/HanXinSvg.js'

const symbol = new HanXinCore('汉信码 123456', {
  errorCorrection: 'L2', // L1, L2, L3 or L4; default L2
  version: 'auto',       // 1–84 or auto
  mask: 'auto',          // 0–3 or auto
  eci: 0,                // optional ECI assignment number, 0–999999
  gs1: false,            // true for a GS1 element string
  uri: false,            // true for compact URI/URL encoding
}).generate()

const svg = new HanXinSvgRenderer(symbol, {
  scale: 4,
  margin: 4,
  foreground: '#000000',
  background: '#ffffff',
}).render()
```

Strings are encoded as GB18030. `Uint8Array`, any typed-array view and
`ArrayBuffer` are accepted as raw binary input.

The result contains `modules`, `size`, `rows`, `columns`, `version`,
`errorCorrection`, `mask`, `dataCodewords`, `errorCodewords`, `codewords`,
RS `blocks`, selected `modes` and `segments`, `bitLength`, and capacity
metadata. An explicitly forced version that is too small throws instead of
silently selecting a different symbol.

## Implemented encodation

- Numeric and two-submode Text
- Binary
- Common Chinese Region One and Region Two
- GB18030 two-byte and four-byte regions
- automatic dynamic-programming segmentation
- ECI headers
- GS1 framing and FNC1 element separators
- URI-A, URI-B, URI-C and compact `%XX` byte sequences
- all 84 versions and ECC levels L1–L4
- ISO-style structural information, assistant/alignment patterns, RS blocks,
  picket-fence reordering and all four data masks

Set `gs1: true` for a GS1 element string without human-readable AI
parentheses. Insert ASCII GS (`\x1D`) between variable-length element strings;
the core writes the Han Xin GS1 framing and FNC1 separator encoding. It does
not maintain an Application Identifier catalog, infer separators from
parentheses or validate checksums. GS1 mode uses the GS1 ASCII character set
and cannot be combined with ECI.

Set `uri: true` to encode an ASCII URI. The encoder automatically chooses the
smallest sequence of URI-A, URI-B, URI-C and Percent-Encoding submodes and uses
built-in fragments such as `https://`, `www.`, `.com` and `.org`. Existing
`%XX` sequences are preserved byte-for-byte and compacted; non-ASCII URI data
must therefore be percent-encoded by the caller. URI mode cannot be combined
with GS1 or ECI.

The optional dedicated Unicode mode is not currently exposed. One ECI value
applies to the complete ordinary input; a public multi-segment ECI API is not
yet provided.

## References and verification

- ISO/IEC 20830:2021 defines Han Xin Code.
- Zint's BSD-3-Clause Han Xin implementation and tables are the primary
  executable development reference. The committed Annex K test compares a
  complete 23×23 matrix exactly and exercises automatic masking.
- BWIPP/bwip-js is used only as an external development cross-check. It is not
  installed by this repository and is not imported by production code.
- GS1 framing, FNC1 separator encoding and numeric-boundary optimization are
  verified against BWIPP's MIT-licensed Han Xin PostScript reference.

BWIPP currently writes an alternating pattern into the final six structural
information bits. ISO/IEC 20830:2021 and current Zint clear those bits. This
core follows the latter behavior, so a raw full-matrix comparison with BWIPP
must normalize those reserved bits. BWIPP and Zint are never runtime
dependencies; the generated standard tables and GB18030 map are committed so
browser consumers need no download or codec package.

Table regeneration is a maintainer operation:

```text
node scripts/generate-hanxin-tables.mjs <zint/hanxin.h> <zint/gb18030.h> libs
```

See `THIRD_PARTY_NOTICES.md` for attribution.
