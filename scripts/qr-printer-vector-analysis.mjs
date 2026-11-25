import { calculateQrMaskPenalty } from '../libs/QRMaskPenalty.js'
import { qrMaskScoreParts } from '../tests/helpers/qr-mask-oracle.mjs'

export function analyze(matrix, zebraScore, genericScore) {
  const parts = qrMaskScoreParts(matrix)
  const events = [], legacyEvents = []
  let doubleCount = 0, partialCount = 0
  for (const axis of ['row', 'column']) for (let line = 0; line < matrix.length; line++) {
    const bits = (axis === 'row' ? matrix[line] : matrix.map(row => row[line])).map(Number).join('')
    const runs = [...bits.matchAll(/0+|1+/g)].map(match => ({ bit: match[0][0], length: match[0].length, start: match.index }))
    for (let i = 0; i + 4 < runs.length; i++) {
      const n = runs[i].length
      if (runs[i].bit !== '1' || runs[i + 1].length !== n || runs[i + 2].length !== 3 * n
        || runs[i + 3].length !== n || runs[i + 4].length !== n) continue
      const before = runs[i - 1]?.length || 0, after = runs[i + 5]?.length || 0
      if (before >= 4 || after >= 4) events.push({ axis, line, start: runs[i].start, unit: n, before, after })
    }
    for (const match of bits.matchAll(/(?=(1011101))/g)) {
      const start = match.index, end = start + 7
      const before = start >= 4 && bits.slice(start - 4, start) === '0000'
      const after = bits.slice(end, end + 4) === '0000'
      if (before && after) doubleCount++
      const partial = bits[start - 1] === '1' || bits[end] === '1'
      if (before || after) legacyEvents.push({ axis, line, start, before, after, partial })
      if ((before || after) && partial) partialCount++
    }
  }
  const scaledCount = events.filter(event => event.unit > 1).length
  const iso = calculateQrMaskPenalty(matrix)
  const zebra = zebraScore(matrix), generic = genericScore(matrix)
  if (iso !== parts.total || parts.n3 !== events.length * 40) throw new Error('N3 event accounting differs from production')
  if (zebra - iso !== 40 * (doubleCount + partialCount - scaledCount)) throw new Error('Unexplained Toolkit N3 difference')
  return { ...parts, iso, zebra, generic, events, legacyEvents, doubleCount, partialCount, scaledCount,
    withoutDouble: zebra - 40 * doubleCount, withoutScaled: iso - 40 * scaledCount,
    withPartial: iso + 40 * partialCount }
}

export function winner(scores, key) {
  const values = scores.map(score => score[key])
  return values.indexOf(Math.min(...values))
}

export function strictlyDifferent(scores, left, right) {
  const a = winner(scores, left), b = winner(scores, right)
  return a !== b && scores[a][left] < scores[b][left] && scores[b][right] < scores[a][right]
}
