// SPDX-FileCopyrightText: 2026 David Block
// SPDX-License-Identifier: MIT OR Apache-2.0

// Empirically reconstructed from Legacy placement grids; not a quoted normative
// algorithm. No placement constants or reference imports are used here.
export function generatePlacement(symbolSide) {
  if (!Number.isInteger(symbolSide) || symbolSide < 9 || symbolSide > 49 || symbolSide % 2 !== 1) {
    throw new RangeError('Legacy symbol side must be odd, from 9 through 49');
  }
  const n = symbolSide - 2;
  const width = Math.ceil(Math.log2(n));
  const order = [];
  for (let i = 0; i < 2 ** width; i++) {
    let input = i, reversed = 0;
    for (let bit = 0; bit < width; bit++) {
      reversed = reversed * 2 + input % 2;
      input = Math.floor(input / 2);
    }
    if (reversed < n) order.push(reversed);
  }
  const inverse = Array(n);
  order.forEach((value, index) => { inverse[value] = index; });
  const placement = Array(n * n);
  for (let row = 0; row < n; row++) {
    const k = n - 1 - row;
    for (let col = 0; col < n; col++) {
      const shifted = ((col - 2 * k) % n + n) % n;
      placement[row * n + col] = n * order[shifted] + inverse[k];
    }
  }
  // Swap, rather than overwrite: preserve each displaced corner value.
  for (const [value, corner] of [[0, n * (n - 1)], [1, n - 1], [2, 0], [3, n * n - 1]]) {
    const from = placement.indexOf(value);
    [placement[from], placement[corner]] = [placement[corner], placement[from]];
  }
  return placement;
}
