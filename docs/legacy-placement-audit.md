# Legacy placement audit: H.9-H.11 (2026-09-11)

The corrected tables have data sides 23, 25 and 27 (complete symbol sides
25, 27 and 29 including the finder border). The old Toolkit constants differed
in 506, 600 and 702 cells respectively. The correction changes placement only.

## Direct PDF evidence

All 1,883 cells were extracted from both sources and compared exactly:

| Table | Data side | Symbol side | FCD PDF page | GOST PDF page |
|---|---:|---:|---:|---:|
| H.9 | 23 | 25 | 85 | 75 |
| H.10 | 25 | 27 | 86 | 76 |
| H.11 | 27 | 29 | 87 | 77 |

FCD extraction used both pypdf and pdfplumber, with identical results. GOST
extraction used positioned words grouped into rows and sorted by horizontal
position: its text layer splits some numbers when extracted as plain text.
Every GOST row had exactly the expected number of cells and matched FCD.
Rendered GOST pages were also inspected. ISO 2000 PDF page 41 was visually
sampled, not completely transcribed: (row,column) (0,1), (1,0), (n-1,1) were
102/476/368, 603/123/400, and 658/125/432 respectively.

Local source filenames and SHA-256:

- ISO-IEC-FCD-16022-2005.shibata.pdf:
  c618f525c53d884614237349e0e83a85dd4378bca6ad64982d484bec6242fcaa
- GOST-R-ISO-IEC-16022-2008.ru.mirror.pdf:
  ce038dcde4cd82c8626b9782abb2c379868f7d9bd709dd836cd69c5459b9888d
- ISO-IEC-16022-2000.shibata.pdf:
  3726076a792673241f9dfef2253e6e1dc815573e3fd564cd176638001ba2d317

Fixed hashes of the comma-separated decimal cells are pinned in
`tests/dm-legacy-placement-generator.test.mjs`. No PDF files are distributed.

## Mathematical control

`libs/DMlegacyPlacementGenerator.js` computes the permutation from filtered
bit reversal, its inverse, a cyclic shift by twice the row index, and four
corner swaps. It imports no placement tables and has no size-specific patches.
The formula was empirically reconstructed, not quoted from the standard or
proved for arbitrary dimensions. Its supported domain is the 21 odd symbol
sizes from 9 through 49. Tests compare all 18,389 cells against the fixed historical
tables in `tests/fixtures/legacy-placement/packed-tables.json` and check permutation integrity and rejection of unsupported sizes.

In the Toolkit audit, the three new regression cases failed before correction; its other sizes already matched. QR Atelier additionally required the H.12 correction described below. Production now generates each requested size once and caches the frozen array.
The public accessor still returns a defensive copy. The packed tables are fixed
test fixtures, outside the production module import graph; tests
never regenerate their expected values. QR Atelier is the maintenance source for the generator; downstream Toolkit copies should pin and verify the source commit. Agreement with the decoder
and this derived generator does not substitute for physical-printer validation
of every size and ECC level.

## QR Atelier adoption

Ported from Streetblock/zpl-toolkit commit 2cc0830 (Apache-2.0).
The generator, cache and fixed fixtures preserve the reviewed Toolkit behavior.
QR Atelier also still had the old H.12 (31-module symbol) table: 812 entries
differed from the corrected table. That correction was previously validated in
the Toolkit against the source table and a physical 200-digit ECC 000 symbol.
This port adds no new physical-printer evidence. Existing randomization, ECC,
content encoding and the explicit ECC 200 editor default are unchanged.
