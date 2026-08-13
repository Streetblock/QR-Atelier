# Data Matrix ECC 000–140 Implementation Specification

Status: implementation contract for `DmLegacyCore`

Scope: Data Matrix ECC 000, ECC 050, ECC 080, ECC 100, and ECC 140

Non-scope: Data Matrix ECC 200, DMRE, and ZPL command parsing

## 1. Purpose

This document defines the observable behavior and internal stages required for
an independent implementation of the historic Data Matrix ECC 000–140 family.
Implementation work must proceed from this contract and its tests rather than
from ad-hoc comparison with an existing renderer.

The legacy encoder must remain separate from `DmCore`, which implements ECC 200
and DMRE. The two families have different symbol sizes, headers, data packing,
error protection, randomization, and placement rules. They may share only
output-neutral components such as SVG rendering of an already completed module
matrix.

The key words MUST, MUST NOT, SHOULD, and MAY describe implementation
requirements. A requirement marked **pending verification** must not be exposed
as conformant behavior until its test oracle is available.

## 2. Source and evidence policy

### 2.1 Source hierarchy

1. GOST R ISO/IEC 16022-2008 is the primary implementation source. It declares
   itself an identical adoption of ISO/IEC 16022:2006, apart from additional
   Russian national annexes, and incorporates Technical Corrigendum 1.
2. ISO/IEC 16022:2006 and its corrigenda, when legitimately available, resolve
   translation, OCR, or edition ambiguities.
3. The US patent family and later patents are corroborating historical sources.
   They are not substitutes for normative algorithms or tables.
4. Zebra output is the authority for ZPL integration behavior, including `^BX`
   defaults and invalid-parameter handling. It is not allowed to silently alter
   the underlying Data Matrix bit stream.
5. Labelary and other encoders are comparison oracles, never the specification.

Exact local source files, hashes, page mappings, and research notes live below
the ignored `dev/` directory. Norm text, figures, and copied tables MUST NOT be
committed to this MIT-licensed repository.

### 2.2 Patent cross-check

| Source | Independently supports | Does not establish |
| --- | --- | --- |
| US 4,939,354 and continuations US 5,053,609 / US 5,124,536 | two solid adjacent borders, two alternating borders, variable density, compact character representations, and historical redundancy concepts | the standardized five ECC modes, record prefix, CRC, convolution taps, master random stream, or Annex H placement |
| US 5,612,524 | orientation/timing-border rationale and recovery of a module grid | Data Matrix ECC 000–140 encoding |
| US 6,244,764 | legacy symbols are square, use odd dimensions from 9×9 through 49×49, are bit/cell-oriented, and have a dark upper-right module in normal polarity | the encoder pipeline or exact error-correction algorithms |

The early patent's selectable redundancy up to 400% and distribution-key model
MUST NOT be treated as a definition of ECC 000, 050, 080, 100, or 140. The five
standardized modes are defined by the standard's fixed headers and convolutional
structures below.

## 3. Public core contract

The intended API boundary is:

```js
new DmLegacyCore(data, {
  ecc: 0,             // 0, 50, 80, 100, or 140
  format: 'auto',     // auto or explicit format ID 1–6
  symbolSize: null,   // auto or an odd square size from 9×9 to 49×49
}).generate()
```

The generated result MUST include at least:

- `rows`, `cols`, and a square boolean `modules` matrix;
- the selected ECC mode, format ID, and symbol size;
- the encoded, unprotected, protected, unrandomized, and randomized bit streams
  in diagnostic output or through an internal test interface;
- enough metadata to determine why an input does not fit.

Strings are accepted only when their conversion to the selected legacy
repertoire is unambiguous. Format 6 MUST also accept `Uint8Array`. Unicode-to-byte
conversion is outside this core unless the caller explicitly supplies it.

## 4. Common encoding pipeline

Every mode MUST execute these stages in order:

1. Select one high-level format for the complete message and encode the original
   user data into `encodedBits`.
2. Build the 30-bit data prefix and prepend it to form `unprotectedBits`.
3. Apply the selected convolutional mode, except for ECC 000, to form
   `protectedBits`.
4. Prepend the mode header and append zero tail bits until the data area is an
   allowed odd square. This forms `unrandomizedBits`.
5. XOR the complete stream with the master random bit stream, starting at its
   first/MSB bit, to form `randomizedBits`.
6. Place the randomized bits through the placement grid and add the finder
   border to form the final symbol.

No stage may be merged with another until its intermediate bit stream has a
direct test. This makes bit-order mistakes diagnosable.

## 5. High-level formats

One format applies to the entire symbol. Segment switching is not supported by
this legacy family.

| ID | Format | Repertoire | Full-group packing |
| ---: | --- | --- | --- |
| 1 | base 11 | space and digits `0`–`9` | 6 values → 21 bits |
| 2 | base 27 | space and uppercase `A`–`Z` | 5 values → 24 bits |
| 3 | base 41 | base 37 plus `.`, `,`, `-`, `/` | 4 values → 22 bits |
| 4 | base 37 | space, uppercase `A`–`Z`, digits `0`–`9` | 4 values → 21 bits |
| 5 | ASCII | 7-bit ASCII | 1 value → 7 bits |
| 6 | user-defined bytes | byte values 0–255 | 1 value → 8 bits |

The apparently non-numeric ID ordering (base 41 before base 37) is intentional.
The 5-bit format field is the binary value `formatId - 1`, emitted MSB first.

### 5.1 Automatic selection

`format: 'auto'` MUST select the first repertoire that represents the complete
message in this order: base 11, base 27, base 37, base 41, ASCII, bytes. It MUST
NOT select per-message segments or optimize solely against the final symbol
size.

### 5.2 Value maps and partial groups

- Base 11: space = 0; digits `0`–`9` = 1–10.
- Base 27: space = 0; `A`–`Z` = 1–26.
- Base 37: space = 0; `A`–`Z` = 1–26; `0`–`9` = 27–36.
- Base 41: base-37 values plus `.` = 37, `,` = 38, `-` = 39, `/` = 40.

For a group of values `C1..Cn`, the packed integer is:

```text
C1 + C2×base + C3×base² + … + Cn×base^(n-1)
```

Each packed integer is emitted least-significant bit first using the exact width
below. No rounding to a byte boundary is permitted.

| Values in partial/full group | base 11 | base 27 | base 37 | base 41 |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 4 | 5 | 6 | 6 |
| 2 | 7 | 10 | 11 | 11 |
| 3 | 11 | 15 | 16 | 17 |
| 4 | 14 | 20 | 21 | 22 |
| 5 | 18 | 24 | — | — |
| 6 | 21 | — | — | — |

ASCII and byte values are likewise emitted least-significant bit first in their
7- or 8-bit fields. Tests MUST cover every partial-group length.

## 6. Data prefix and CRC

The data prefix is exactly 30 bits:

```text
format: 5 bits | CRC: 16 bits | original data length: 9 bits
```

- `format` is emitted MSB first as described above.
- `original data length` counts original characters/bytes before compaction,
  ranges from 0 through 511, and is emitted LSB first.
- CRC is calculated over the original uncompressed 8-bit user bytes, prefixed
  by the two bytes `[formatId, 0x00]`.
- The CRC polynomial is `x^16 + x^12 + x^5 + 1`.
- An equivalent implementation is reflected CRC-CCITT with polynomial `0x8408`
  and initial register `0x0000`, processing `[formatId, 0, ...data]`.
- The final register is emitted bit-reversed as the 16-bit transmitted field.
- There is no final XOR.

`unprotectedBits` is the prefix followed immediately by `encodedBits`.

## 7. Five ECC modes

The structure notation `n-k-m` means `k` input bits per cycle, `n` output bits
per cycle, and a maximum memory length of `m` cycles. A final incomplete input
group is zero-filled; then `m` all-zero input groups flush the encoder.

| Mode | Standard identifier (MSB→LSB) | Emitted header (LSB→MSB) | Convolution structure | Output expansion | Maximum damage |
| ---: | --- | --- | --- | ---: | ---: |
| 000 | `1111110` | `0111111` | none | 0% | none |
| 050 | `0001110000000001110` | `0111000000000111000` | 4-3-3 | 33⅓% | 2.8% |
| 080 | `1110001110000001110` | `0111000000111000111` | 3-2-11 | 50% | 5.5% |
| 100 | `1111111110000001110` | `0111000000111111111` | 2-1-15 | 100% | 12.6% |
| 140 | `1111110001110001110` | `0111000111000111111` | 4-1-13 | 300% | 25% |

The standard identifier is listed for auditability. The actual header prepended
to `protectedBits` is its complete bit reversal shown in the emitted column.

### 7.1 ECC 000

`protectedBits` MUST equal `unprotectedBits`. No convolutional padding or flush
groups are added. The emitted 7-bit ECC 000 header is still required.

ECC 000 is implemented through the complete shared pipeline for reviewed
placement sizes. A raw-byte 9x9 symbol protects header, prefix, randomization,
placement, and finder-border integration against regression. This is a
structural fixture produced from the independently tested stages; it is not yet
an external complete-symbol conformance vector. ECC 000 MUST remain described
as pending independent symbol verification until Gate C is satisfied.

### 7.2 ECC 050

Split the input into 3-bit groups, zero-fill the last group, append three zero
groups, and emit four bits per cycle through the 4-3-3 state machine.

For input bits `a`, `b`, and `c`, let `a1` be `a` delayed by one cycle,
`a2` delayed by two cycles, and so on. The four output bits in transmission
order are:

```text
v1 = a  XOR c1 XOR c2 XOR b3 XOR c3
v2 = b  XOR b1 XOR a2 XOR a3 XOR b3
v3 = c  XOR a1 XOR b1 XOR c1 XOR a2 XOR a3
v4 = a  XOR b  XOR c  XOR a1 XOR b1 XOR c1 XOR b2 XOR c3
```

These equations MUST reproduce all 24 input/output cycles and the complete
13x13 Annex-Q symbol. This makes ECC 050 verified for the reference path.

### 7.3 ECC 080

Split the input into 2-bit groups, zero-fill the last group, append eleven zero
groups, and emit three bits per cycle through the 3-2-11 state machine.

For input bits `a` and `b`, let `a1` be `a` delayed by one cycle, `a2`
delayed by two cycles, and so on. The three output bits in transmission order
are:

```text
v1 = a XOR a1 XOR a3 XOR b3 XOR a4 XOR a5 XOR a6 XOR a7 XOR b7 XOR a10 XOR b11
v2 = b XOR a1 XOR a3 XOR b3 XOR a4 XOR a5 XOR b6 XOR a8 XOR b8 XOR a9 XOR b9 XOR a10
v3 = a XOR b XOR b1 XOR b2 XOR b4 XOR a5 XOR a6 XOR a7 XOR b7 XOR b9 XOR b11
```

The equations and output order are transcribed from the state-machine diagram
and independently cross-checked against complete 13x13 symbols for multiple
payloads. The convolution stage and the reviewed-size end-to-end path are
implemented; an independently licensed normative complete-symbol fixture is
still required before claiming full conformance for every legacy size.

### 7.4 ECC 100

Process one input bit per cycle, append fifteen zero input bits, and emit two
bits per cycle through the 2-1-15 state machine.

### 7.5 ECC 140

Process one input bit per cycle, append thirteen zero input bits, and emit four
bits per cycle through the 4-1-13 state machine.

The precise XOR taps and output order MUST be transcribed from the four
state-machine diagrams and verified against reference vectors. Structure names
alone are insufficient. ECC 100 and 140 remain **pending verification** and
MUST NOT be advertised as supported.

## 8. Symbol sizing and capacity

The data area is an odd square from 7×7 through 47×47. Adding the one-module
finder border on every side produces odd square symbols from 9×9 through 49×49.

After protection, select the smallest supported data area for which:

```text
eccHeader.length + protectedBits.length <= dataSide²
```

Append zero tail bits to fill the selected data area exactly. A forced size MUST
be rejected when too small. Automatic selection MUST fail when no size through
49×49 fits.

Mode-specific symbol ranges and raw 8-bit capacities are:

| Mode | Supported symbol sides | Raw-byte capacities in ascending side order |
| ---: | --- | --- |
| 000 | 9–49, step 2 | 1, 5, 10, 16, 23, 31, 40, 50, 61, 73, 86, 100, 115, 131, 148, 166, 185, 205, 226, 248, 271 |
| 050 | 11–49, step 2 | 0, 4, 9, 14, 20, 27, 34, 42, 51, 61, 72, 83, 95, 108, 121, 135, 150, 166, 183, 200 |
| 080 | 13–49, step 2 | 2, 6, 10, 16, 22, 28, 36, 44, 52, 62, 72, 82, 94, 106, 118, 132, 146, 160, 176 |
| 100 | 13–49, step 2 | 0, 3, 7, 11, 15, 20, 26, 32, 38, 45, 53, 61, 69, 78, 88, 98, 108, 119, 131 |
| 140 | 17–49, step 2 | 1, 3, 5, 7, 10, 13, 16, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63 |

A zero capacity means the symbol size exists for the mode but cannot encode a
single format-6 byte after mandatory overhead. Capacity tests MUST verify the
last fitting and first overflowing payload for every listed size.

## 9. Randomization

Randomization is bitwise XOR of the entire `unrandomizedBits` stream—header,
protected data, and tail—with the master random bit stream. Both streams start
at their first/MSB position. The random stream is never restarted between
fields.

The implementation contains the visually transcribed 2,209-bit master stream
required for a 47×47 data area: 276 complete bytes in MSB-first order followed
by the final zero bit. Its identity is protected by a full-stream SHA-256 digest,
prefix and suffix assertions, the maximum-length XOR test, and the Annex-Q test.
OCR output alone is not an accepted source for this sequence.

## 10. Placement and finder pattern

Each allowed data-side length has a fixed placement grid. A placement
implementation MUST prove that every zero-based integer position from 0 through
`dataSide² - 1` appears exactly once and that no position is outside the grid.

Data sides 7 through 29 (Annex H tables H.1 through H.12) are implemented as
packed zero-based numeric permutations. The runtime data is deliberately not a
formatted reproduction of the normative tables. Each permutation has:

- an exact dimension assertion;
- a range and bijection assertion;
- a SHA-256 identity check over its little-endian 16-bit positions;
- placement tests independent of the complete ECC-050 reference.

The Russian adoption's H.4 table contains two entries with value 52 and no
entry with value 62. Technical Corrigendum 2 changes only the reference decode
algorithm in clause 9 and does not resolve Annex H. Comparison with the
surrounding H.4 progression identifies row 10, column 9 as position 62; the
bottom-row position remains 52. This correction is isolated by a regression
test and restores the mandatory permutation invariant.

Data sides 31 through 47 remain pending because their H.13-H.21 foldout tables
are not present in the reviewed source set. They MUST be rejected explicitly
rather than generated from an unverified pattern.

Automatic sizing selects the smallest implemented data side whose square holds
the ECC header and protected bits. Forced symbol sizes are validated against
the selected ECC mode and available placement grids. Sizes 33x33 through 49x49
are rejected as pending verification rather than approximated.

The final finder border is one module wide:

- left border: all dark;
- bottom border: all dark;
- top border: alternating, starting dark at the upper-left corner;
- right border: alternating, starting dark at the upper-right corner.

Consequently, a normal-polarity legacy symbol has a dark upper-right module.
The quiet zone is at least one module on all sides and is rendering metadata,
not part of the `modules` matrix.

## 11. Normative reference fixture: ECC 050

The first end-to-end acceptance fixture uses:

```text
payload:       AB12-X
format:        3 (base 41)
ECC mode:      050
symbol size:   13×13 (11×11 data area)
```

Required checkpoints:

```text
base-41 values:       1, 2, 28, 29 | 39, 24
packed integers:      2045860 | 1023
encodedBits:          0010010111101100111110 11111111110
CRC register:         0x7559
transmitted CRC:      1001101010101110
length field:         011000000
unprotectedBits:      00010 1001101010101110 011000000
                      0010010111101100111110 11111111110
protectedBits:        00001010101111111010101010100000
                      01000011011010000101000110000000
                      11101010100110101001100001001010
emitted ECC header:   0111000000000111000
tail:                 000000
```

The final symbol MUST be exactly:

```text
1010101010101
1110100110010
1100101011011
1101110010100
1110111010101
1011000011000
1111010011011
1001001111100
1101011110011
1011111010100
1100100111101
1001101101110
1111111111111
```

This single fixture does not establish conformance for ECC 080, 100, or 140.

## 12. Conformance gates

### Gate A — source transcription

- Every numeric table or state-machine transcription records its local source
  section and receives a second-person visual review.
- OCR text alone is never accepted for bit strings, taps, or placement indices.
- Known corrections in the adopted standard are covered by regression tests.

### Gate B — stage tests

- All six format IDs and every partial group length have exact bit tests.
- CRC has both the ECC-050 fixture and independent check vectors.
- Every ECC mode has exact input/output state-machine vectors, including flush.
- Randomization and placement have bijection/integrity tests.

### Gate C — complete symbols

- The ECC-050 fixture above is module-exact.
- Each of the other four modes has at least two independently verified complete
  symbol fixtures, including a minimum-size and a multi-group payload.
- Every forced-size boundary has fit/overflow tests.

### Gate D — integration

- Existing ECC 200 and DMRE tests remain unchanged and green.
- ZPL `^BX` maps omitted quality and `q=0` to ECC 000.
- `q=50`, `80`, `100`, and `140` select only their matching legacy mode.
- Invalid/too-small forced sizes follow verified Zebra behavior.
- Printer comparisons record printer model, firmware, resolution, complete ZPL,
  captured output, and whether the comparison is module- or image-level.

## 13. Open verification items

Before declaring all five modes conformant:

1. Transcribe and independently review the exact XOR taps and output order for
   the 3-2-11, 2-1-15, and 4-1-13 machines. The 4-3-3 machine is verified by
   every Annex-Q state cycle and the complete ECC-050 module matrix.
2. Obtain and independently review the H.13-H.21 placement grids for data sides
   31 through 47. H.1-H.12 (7 through 29) are implemented with exact identity
   and permutation tests.
3. Obtain complete-symbol reference vectors for ECC 000, 080, 100, and 140 from
   a real Zebra printer or another independently validated encoder.
4. Compare remaining Russian wording and diagrams against a complete English
   source where ambiguity remains. Technical Corrigendum 2:2011 was reviewed
   and changes clause 9 only, not legacy placement.
