// ISO/IEC 18004:2015, 7.8.3.1 mask evaluation on the complete symbol matrix.
// See docs/qr-mask-scoring.md for the explicit N3 interpretation.

export function calculateQrMaskPenalty(modules) {
  const size = modules.length
  let penalty = 0

  for (let y = 0; y < size; y += 1) {
    penalty += calculateRunPenalty((x) => modules[y][x], size)
  }

  for (let x = 0; x < size; x += 1) {
    penalty += calculateRunPenalty((y) => modules[y][x], size)
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x]
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) {
        penalty += 3
      }
    }
  }

  for (let y = 0; y < size; y += 1) {
    penalty += calculateFinderLikePatternPenalty((x) => modules[y][x], size)
  }

  for (let x = 0; x < size; x += 1) {
    penalty += calculateFinderLikePatternPenalty((y) => modules[y][x], size)
  }

  let darkModules = 0
  for (const row of modules) {
    for (const module of row) {
      if (module) darkModules += 1
    }
  }

  const percentage = (darkModules * 100) / (size * size)
  penalty += Math.floor(Math.abs(percentage - 50) / 5) * 10
  return penalty
}

function calculateRunPenalty(getValue, length) {
  let penalty = 0
  let runColor = false
  let runLength = 0

  for (let index = 0; index < length; index += 1) {
    const color = getValue(index)
    if (index === 0 || color !== runColor) {
      runColor = color
      runLength = 1
    } else {
      runLength += 1
      penalty += runLength === 5 ? 3 : runLength > 5 ? 1 : 0
    }
  }

  return penalty
}

function calculateFinderLikePatternPenalty(getValue, length) {
  const runs = []
  for (let index = 0; index < length; index += 1) {
    const color = getValue(index)
    const previous = runs[runs.length - 1]
    if (previous && previous.color === color) previous.length += 1
    else runs.push({ color, length: 1 })
  }

  let penalty = 0
  for (let start = 0; start + 4 < runs.length; start += 1) {
    if (!runs[start].color) continue
    const unit = runs[start].length
    if (runs[start + 1].length !== unit || runs[start + 2].length !== 3 * unit
      || runs[start + 3].length !== unit || runs[start + 4].length !== unit) continue

    // Match complete dark/light runs, including scaled 1:1:3:1:1 ratios.
    // Table 11 requires four actual light modules, not four ratio units.
    // Missing runs at a matrix edge do not supply virtual quiet-zone modules.
    const before = runs[start - 1]?.length ?? 0
    const after = runs[start + 5]?.length ?? 0
    if (before >= 4 || after >= 4) penalty += 40
  }
  return penalty
}
