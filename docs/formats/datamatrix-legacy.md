# Data Matrix Legacy (ECC 000-140)

This feature is intentionally separate from the modern Data Matrix ECC 200 core. It covers the historical ECC 000, ECC 050, ECC 080, ECC 100, and ECC 140 variants only.

## Status and source policy

Implementation is governed by [the English implementation specification](./datamatrix-legacy-implementation-spec.md). It was derived from the complete GOST R ISO/IEC 16022-2008 text, an identical Russian adoption of ISO/IEC 16022:2006 with national annexes, and cross-checked against the relevant US patents. Public catalog records and the exact local research copies are recorded outside Git. Incomplete web summaries and preview fragments are not implementation sources.

The 2006 table of contents identifies all required normative material:

- Clause 6: ECC 000-140 requirements.
- Annex G: symbol attributes for all five ECC variants.
- Annex H: data-module placement grids.
- Annex I: character encodation schemes.
- Annex J: CRC state machine, polynomial, and two-byte header.
- Annex K: error-checking and convolutional error-correcting algorithms.
- Annex L: master random bit stream.
- Annex Q: complete ECC 050 encode example.

Public patents and printer documentation are useful corroborating sources, but are not complete enough to replace those normative annexes.

## Historical context

- Data Matrix originated at International Data Matrix, Inc. in the late 1980s. The earliest patent family claims priority from 5 May 1988.
- ECC 000, 050, 080, 100, and 140 are selectable protection levels of the original convolutional-code family. They should not be treated as five successive generations.
- Around 1995-1996 the AIM Technical Symbology Committee added and standardized ECC 200, using Reed-Solomon error correction.
- ISO/IEC 16022:2000 standardized both the legacy family and ECC 200.
- ISO/IEC 16022:2006 retained both families and recommended ECC 200 for new applications.
- ISO/IEC 16022:2024 removed the complete historical ECC 000-140 family. Zebra still accepts it in `^BX` for compatibility and still defines omitted quality as ECC 000.

## Architectural boundary

The existing `DmCore` remains an ECC 200 and DMRE encoder. Legacy support should be implemented behind a separate `DmLegacyCore` so that symbol tables, placement, padding, CRC, and error correction cannot accidentally leak between incompatible families.

Initial API direction:

```js
new DmLegacyCore(data, {
  ecc: 0,             // 0, 50, 80, 100, or 140
  format: 'auto',     // later mapped to the six legacy format IDs
  symbolSize: null,   // odd square legacy size or automatic
}).generate()
```

The first implementation scope is raw 8-bit input and the six legacy format IDs. Modern ECC 200 features such as DMRE, Macro 05/06, Structured Append, Reader Programming, and the current segment API must not be assumed to apply.

The SVG renderer can be shared because it consumes a completed boolean module matrix rather than an ECC-specific codeword stream.

## Implementation sequence

1. Maintain the source hierarchy, behavioral requirements, intermediate bit streams, and conformance gates in the implementation specification.
2. Implement the six encodation formats, automatic format selection, record header, length field, and CRC against that specification.
3. Implement the master-random-bitstream operation and normative placement grids.
4. Implement ECC 000 first, then the shared convolutional encoder and the 050, 080, 100, and 140 parameter sets.
5. Add exact module fixtures from the normative ECC 050 example.
6. Compare every level with Labelary and a real Zebra printer.
7. Only after the core is independently verified, integrate it into `zpl-toolkit` and dispatch `^BX` quality 0-140 to `DmLegacyCore`.

## Acceptance criteria

- Omitted ZPL quality and explicit quality 0 produce the same symbol.
- All five legacy ECC values produce the normative module matrix for fixed reference payloads.
- Automatic and explicit format IDs 1 through 6 match the standard.
- Every supported odd square size has verified capacity and placement.
- Too-small forced sizes produce no symbol; dimensions above 49 become automatic in the ZPL adapter.
- The Annex Q ECC 050 example is module-exact.
- Labelary comparisons are recorded, but a real Zebra printer is the final ZPL reference.
- Existing ECC 200, DMRE, ECI, and minimal-encodation tests remain unchanged and green.

## Research references

- GOST R ISO/IEC 16022-2008, identical Russian adoption of ISO/IEC 16022:2006 (implementation source; exact local provenance recorded outside Git).
- ISO/IEC 16022:2006, second edition (source edition represented by that adoption).
- ISO/IEC 16022:2024, third edition (documents removal of the historic variant).
- Zebra ZPL `^BX` command documentation (supported qualities and printer behavior).
- US 4,939,354 patent family (original Data Matrix structure and history; expired).
- AIM historical timeline (addition and publication of ECC 200).
