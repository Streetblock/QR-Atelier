// Test-only, deliberately independent from the production run-length scanner.
// Enumerates pattern widths with regex windows; never pads the symbol border.
export function qrMaskScoreParts(matrix) {
  const size = matrix.length
  const rows = matrix.map(row => row.map(Number).join(''))
  const columns = matrix.map((_, x) => rows.map(row => row[x]).join(''))
  let n1 = 0, n2 = 0, n3 = 0
  for (const line of [...rows, ...columns]) {
    for (const run of line.match(/0{5,}|1{5,}/g) || []) n1 += run.length - 2
    for (let width = 1; width * 7 <= size; width++) {
      const core = `1{${width}}0{${width}}1{${3 * width}}0{${width}}1{${width}}`
      for (const match of line.matchAll(new RegExp(`(?=(${core}))`, 'g'))) {
        const start = match.index, end = start + 7 * width
        if (line[start - 1] === '1' || line[end] === '1') continue
        if ((start >= 4 && line.slice(start - 4, start) === '0000')
          || line.slice(end, end + 4) === '0000') n3 += 40
      }
    }
  }
  for (let y = 1; y < size; y++) for (let x = 1; x < size; x++) {
    const window = rows[y - 1].slice(x - 1, x + 1) + rows[y].slice(x - 1, x + 1)
    if (window === '0000' || window === '1111') n2 += 3
  }
  const dark = rows.join('').replaceAll('0', '').length
  const n4 = Math.floor(Math.abs(20 * dark - 10 * size * size) / (size * size)) * 10
  return { n1, n2, n3, n4, total: n1 + n2 + n3 + n4 }
}
