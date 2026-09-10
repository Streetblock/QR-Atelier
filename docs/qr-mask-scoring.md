# QR mask scoring

The automatic QR mask selection follows the interpretation of ISO/IEC
18004:2015, section 7.8.3.1 and Table 11, described below. This change concerns
mask evaluation, not a certification of the complete encoder or styled output.

Source: [ISO/IEC 18004:2015, user-provided PDF](https://nuintun.github.io/qrcode/spec/ISO-IEC-18004-2015.pdf)
(printed pages 53–54; PDF pages 61–62). Sections 6.3.1 and 6.3.8 distinguish the
symbol from the quiet zone surrounding it.

## Evaluated matrix and selection

`QrCore` constructs all eight mask candidates and evaluates the complete square
matrix, including function patterns, format information and, from version 7,
version information. The candidate with the smallest total penalty wins. Ties
retain the lowest mask number. The external quiet zone is added by rendering;
it contributes neither modules nor virtual light runs to mask scoring.

The public `calculateQrMaskPenalty` function expects a complete, square QR
module matrix without a quiet zone. It does not mutate the matrix.

## Rules used

* N1: Each horizontal or vertical monochrome run of length five or more costs
  three points plus one for every additional module.
* N2: Every monochrome 2×2 block costs three points, including overlapping blocks.
* N3: A sequence of complete dark/light/dark/light/dark runs with lengths
  `n:n:3n:n:n`, for any positive integer `n`, costs 40 points if at least four
  actual light modules immediately precede or follow it in the same row or
  column. The occurrence costs 40 once, including when both sides qualify.
  The light margin is four modules, not `4*n`. Missing modules outside the
  matrix do not count. A partial match inside a longer outer dark run does
  not count as the specified run ratio.
* N4: Each complete five-percentage-point departure from 50% dark modules costs
  ten points. Only modules inside the square matrix enter this calculation.

## Explicit interpretation choices

The 2015 wording has ambiguities that implementations resolve differently:
whether exterior quiet-zone modules count, how to count a pattern with light
space on both sides, and how the ratio applies to scaled runs. Table 11 uses a
four-module minimum while Note 3 describes a larger light area. Here the table's
minimum is applied, the ratio is treated as a ratio of complete runs, and each
core pattern is counted once within the actual matrix. These are documented
implementation decisions, not an official ISO clarification.

Consequently, matching the output of another library is not by itself the
acceptance criterion. For context, these differences are also discussed in
[libqrencode issue 220](https://github.com/fukuchi/libqrencode/issues/220).
That discussion is not a normative source.

## Changes from main at c657e1c

The old N3 implementation searched only the seven individual bits `1011101`.
It accepted a shortened or empty light range at the matrix edge and could
recognize a partial pattern inside a longer dark run. It missed scaled run
ratios. The new implementation evaluates complete runs and real light margins.
N1, N2 and N4, candidate construction and manually selected masks are unchanged.

For example, byte-mode `a`, version 1, error correction L, ISO-8859-1 without
ECI now selects mask 3 instead of mask 0. Existing automatic output may therefore
change its matrix while preserving its encoded contents.

## Verification

Run `npm ci --ignore-scripts` followed by `npm test`.

* `tests/qr-mask-iso.test.mjs` exercises matrix edges, four-module margins,
  scaled ratios, complete run boundaries, multiple occurrences and N1/N2.
* `tests/qr-mask-penalty.test.mjs` retains focused row/column and automatic-mask
  regressions.
* `tests/qr-mask-selection.test.mjs` compares 1,000 deterministic matrices to a
  separate window/regular-expression scorer and checks N4 arithmetic for every
  possible dark-module count in all 40 QR versions. It verifies all eight full
  candidates for versions 1, 2, 6, 7, 9, 10, 26, 27 and 40, across all four error
  correction levels, and checks that automatic selection takes the first minimum.
  ZXing independently decodes all these candidates from their module matrices.
* Existing decoding tests continue to exercise rendered symbols, encodings,
  Kanji and structured append.

Direct module decoding deliberately excludes image detection. During testing,
ZXing's image detector failed on the sparse version-27/H symbol `ISO 27`, while
its decoder read the same module matrix correctly. These tests therefore do
not establish camera or printer performance for every generated symbol.

The ZPL Toolkit and its Zebra-oriented scoring are outside this change. A
comparison with actual printer output is required before deciding how that
implementation should evolve.
