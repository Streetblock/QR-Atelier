# Native GS1 Composite 2D component

This feature branch builds a dependency-free GS1 Composite Component on the
shared PDF417 foundation from `feat/pdf417-core`. It generates the complete 2D
component as an unscaled `boolean[][]` module matrix:

- CC-A using all 17 Composite-specific MicroPDF417 layouts;
- CC-B using the standardized MicroPDF417 layouts and the Composite linkage
  codeword;
- CC-C using standard PDF417 layouts, adaptive error correction, and the
  Composite linkage codeword.

The runtime imports no BWIPP or ZXing code. BWIPP is used only outside the
repository to produce deterministic development references. The committed
tests contain the resulting SHA-256 module fingerprints.

## API

```js
import { Gs1CompositeCore } from '../libs/GS1CompositeCore.js'

const component = new Gs1CompositeCore(
  '(01)09521234543213(3103)000123',
  { version: 'a', columns: 3 },
).generate()
```

`version` accepts `auto`, `a`, `b`, or `c`. CC-A and CC-B accept two through
four data columns. CC-C accepts one through 30 columns and may increase the
requested column count when the symbol would otherwise exceed 30 rows.

The result contains:

```js
{
  modules,              // boolean[][], no scaling or quiet zone
  rows,
  columns,              // actual module columns
  dataColumns,
  dataCodewords,
  errorCodewords,
  codewords,
  bits,                 // padded Composite data bit stream
  bitCapacity,
  version,              // CC-A, CC-B, or CC-C
  variant,
  method,
  elements,
  rowAddressPatterns,   // present for CC-A and CC-B
}
```

Bracketed AI syntax with either parentheses or square brackets is accepted.
An already assembled GS1 element string can instead use ASCII Group Separator
(`\x1d`) between variable-length fields.

## Shared PDF417 architecture

`GS1CompositeCore.js` owns only Composite sizing, linkage, and orchestration.
It reuses:

- the 3 × 929 PDF417 codeword pattern table;
- Reed-Solomon error correction modulo 929;
- byte compaction for CC-B and CC-C;
- the MicroPDF417 Row Address Patterns and matrix builder;
- the standard PDF417 row-indicator and matrix builder.

The shared matrix functions and constants are exported from `PDF417core.js`.
The existing public PDF417 and MicroPDF417 classes continue to call those same
functions, so this extraction does not create a second implementation.

## Data encodation

The current core implements GS1 Composite encodation method 0 and the complete
general-purpose field state machine: numeric, alphanumeric, ISO/IEC 646,
latches, FNC1, terminal digit handling, and capacity-specific padding. Method 0
is valid for arbitrary GS1 element strings. Optional encodation methods 10 and
11, which compress certain leading AIs such as 10, 11, 17, and 90 more tightly,
are not yet implemented. Such inputs still generate valid symbols through
method 0 but can select a larger component.

The lightweight bracket parser identifies the fixed-length AI families needed
to place FNC1 separators. It does not act as a full GS1 data validator. Callers
that already validate against a current GS1 application-identifier table can
pass the canonical element string form directly.

## Linear component boundary

This core deliberately returns the native **2D Composite Component**. A complete
printed GS1 Composite symbol also needs a linked linear component (EAN/UPC,
GS1-128, or a GS1 DataBar family), its linkage flag, separator pattern, and
alignment. Those linear encoders remain independent barcode-family modules and
can consume this matrix later. Keeping that composition outside this core avoids
introducing a hidden dependency on one particular linear symbology.

For a future ZPL integration, `^BR` mode 11 can combine a GS1-128 core with CC-A
or CC-B, while mode 12 can combine GS1-128 with CC-C. Painting, row-height
scaling, orientation, separator placement, and ZPL field positioning belong in
the ZPL renderer rather than this symbol core.

## Verification

The deterministic tests cover all CC-A layout declarations, capacity maps,
FNC1 insertion, validation, repeated generation, a large CC-C symbol, and exact
module fingerprints for CC-A/B/C. The reference set exercises numeric,
alphanumeric, lowercase ISO/IEC 646, punctuation, and every CC-A/CC-B column
count. During development all reference matrices were compared module-for-module
with BWIPP and had zero differing modules.

The repository's ZXing dependency remains development-only. Its JavaScript
PDF417 reader does not expose GS1 Composite decoding, so it is not used as a
second decoder for these tests.

## References

- [ISO/IEC 24723, GS1 Composite bar code symbology](https://www.iso.org/standard/75193.html)
- [GS1 General Specifications](https://www.gs1.org/standards/barcodes-epcrfid-id-keys/gs1-general-specifications)
- [Barcode Writer in Pure PostScript](https://github.com/bwipp/postscriptbarcode)
- [Zebra `^BR` command](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-commands/%5Ebr.html)
