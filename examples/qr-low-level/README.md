# QR Low-Level Examples

This folder demonstrates the low-level QR API without committing generated SVG artifacts.

Run the Node generator:

```bash
node examples/qr-low-level/generate.mjs
```

It writes SVGs and a preview page to `examples/qr-low-level/generated/`.

Open the browser example directly:

```text
examples/qr-low-level/browser.html
```

The examples cover:

- `mode: 'byte'` to bypass automatic numeric/alphanumeric compression.
- `mode: 'kanji'` for manual Unicode-to-Shift-JIS Kanji encoding.
- `encoding: 'iso-8859-1'` with ECI for bytes such as `C4 C4 C4`.
- Manual `QrSegment.numeric`, `QrSegment.alphanumeric`, `QrSegment.byte`, `QrSegment.bytes`, `QrSegment.kanji`, and `QrSegment.kanjiBytes` usage.
