# Independent QR reference comparisons

`npm run test:reference` executes the original Nayuki, Segno and ZXing Java
implementations. These are independent comparison implementations, not an
official ISO conformance oracle. No reference encoder is shipped to the browser.

## Reproduce

Use Node.js 24, Python 3.13 and JDK 21 (`java` and `javac` on PATH):

```sh
npm ci --ignore-scripts
python -m pip install -r requirements-test/qr.txt
python scripts/setup-qr-references.py
npm run test:reference
```

`PYTHON`, `JAVA` and `JAVAC` may override executable paths. The Python bridge also
accepts packages installed with `--target .reference-deps/python`. The setup
script downloads the ZXing jar from Maven Central and verifies its SHA-256.
Subsequent reference runs need no network access. Missing dependencies fail the
suite; they do not silently skip it. The GitHub Actions workflow installs and
runs these dependencies separately from the regular JavaScript tests.

Pinned references:

| Implementation | Version | Source |
| --- | --- | --- |
| Nayuki / qrcodegen | 1.8.0 | [Repository](https://github.com/nayuki/QR-Code-generator/tree/v1.8.0) |
| Segno | 1.6.6 | [Encoder](https://github.com/heuer/segno/blob/1.6.6/segno/encoder.py) |
| ZXing Java core | 3.5.3 | [MaskUtil](https://github.com/zxing/zxing/blob/zxing-3.5.3/core/src/main/java/com/google/zxing/qrcode/encoder/MaskUtil.java) |

The existing `@zxing/library` JavaScript decoder is a separate dependency. These
reference tests use the original Java encoder and scorer, not that port.

## Recorded result (2026-09-10)

All five reference tests and the 45 existing JavaScript tests pass. All 352
forced-mask matrices match Nayuki and ZXing Java. Segno's extra padding byte
occurs in 41 of the 44 cases; all 352 Segno matrices match Nayuki when supplied
with those same codewords. Automatic masks differ from QR Atelier in 7/44 cases
for Nayuki, 7/44 for ZXing and 19/44 for Segno. These numbers describe this test
corpus and do not rank encoder quality. The local reference run took about
139 seconds; the suite allows up to ten minutes per external process.

## Matrix comparisons

There are 44 input cases: one byte-mode case for each version 1–40 with rotating
L/M/Q/H error correction, plus Numeric, Alphanumeric, Latin-1 with non-ASCII
characters, and UTF-8 with ECI 26. All eight masks are fixed in turn: 352 matrices
per implementation. Version, error correction, mode and character encoding are
explicit. Error-correction boosting is disabled. ZXing's chosen segment mode is
checked, and its charset hint is omitted for Latin-1 to avoid inserting ECI.

QR Atelier matrices are compared module by module with Nayuki and ZXing Java.
These comparisons cover encoding, padding, Reed-Solomon blocks, module placement,
format/version information and application of each mask for the selected cases.
They do not exhaust all payloads, mixed segments, Kanji or structured append.

### Segno 1.6.6 padding difference

The first run exposed a difference before mask selection: Segno's
`write_padding_bits` adds eight zero bits when the stream already ends at a byte
boundary. For example, byte-mode `iso 1`, version 1-L, has 56 bits after its
terminator. Segno adds a zero byte before the alternating pad codewords; Nayuki,
ZXing and QR Atelier start those pad codewords immediately.

The suite does not suppress arbitrary Segno mismatches. It observes the original
encoder's codewords and checks the exact difference: insertion of one zero byte
at that boundary and removal of the final pad byte to retain capacity. Where
this condition does not occur, matrices must match QR Atelier directly. For all
cases, Segno's matrices must match Nayuki's low-level constructor when supplied
with Segno's exact data codewords. Neither external encoder is patched to change
its output. Hooks only record arguments and delegate to the original methods.

This is a documented reference-library deviation, not a reason to change QR
Atelier padding. A dependency update must re-evaluate the explicit expectations.

## Mask scoring on identical matrices

All 352 completed QR Atelier candidate matrices and five synthetic edge cases
are passed to the external scorers, independently of the encoders' own output.

* N1, N2 and N4 must individually match ZXing Java and Segno.
* Nayuki's original scorer supplies its total. A subclass observes its N3 hit
  count without changing its return values. Its total minus N3 must equal our
  N1+N2+N4. This is an aggregate check of those three rules, not individual
  Nayuki component scores.
* QR Atelier's production total must match its separate test scorer.
* Automatic QR Atelier, Nayuki and ZXing selection must take the first minimum
  of their respective scores on the completed candidates.
* Segno's actual eight selection scores are observed separately: it evaluates
  before writing format/version information. Its selected mask must minimize
  those scores and its automatic matrix must equal its corresponding forced
  mask. A Segno automatic-mask difference can involve both padding and scoring.

## Deliberate N3 disagreements

These expected component scores are checked on a checkerboard matrix with the
specified first row. They describe the pinned implementations, not which one is
officially authoritative. `1` is dark and `0` is light.

| Row | Atelier | ZXing Java | Nayuki | Segno |
| --- | ---: | ---: | ---: | ---: |
| `000010111010000` | 40 | 40 | 80 | 40 |
| `101110110101010` | 0 | 0 | 0 | 40 |
| `0000110011111100110000` | 40 | 0 | 80 | 0 |
| `1000011001111110011000010` | 40 | 0 | 0 | 0 |
| `00001110111010000` | 0 | 40 | 0 | 40 |

The third row includes the matrix border: Nayuki extends its white runs outside
the matrix. The fourth bounds both margins with dark modules, exposing its
requirement for a scaled white margin. ZXing and Segno search a fixed seven-bit
core and therefore do not detect these scaled cores. The final row checks a
partial match within a longer outer dark run.

See [QR Atelier's scoring interpretation](qr-mask-scoring.md) for the production
decision. Runtime scoring and the ZPL Toolkit are unchanged by this test suite.
