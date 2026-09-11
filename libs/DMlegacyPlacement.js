// Legacy placement is generated once per requested size and cached.
// Full historical tables remain in tests/fixtures/legacy-placement only.
import { generatePlacement } from './DMlegacyPlacementGenerator.js'

export const LEGACY_PLACEMENT_DATA_SIDES = Object.freeze(
  Array.from({ length: 21 }, (_, index) => 7 + index * 2),
)

const placementCache = new Map()

function cachedPlacement(dataSide) {
  if (!Number.isInteger(dataSide) || !LEGACY_PLACEMENT_DATA_SIDES.includes(dataSide)) {
    throw new RangeError(
      `Legacy placement currently supports data sides ${LEGACY_PLACEMENT_DATA_SIDES.join(', ')}`,
    )
  }

  if (!placementCache.has(dataSide)) {
    const placement = Object.freeze(generatePlacement(dataSide + 2))
    if (placement.length !== dataSide * dataSide) {
      throw new Error(`Invalid ${dataSide}x${dataSide} legacy placement length`)
    }
    placementCache.set(dataSide, placement)
  }
  return placementCache.get(dataSide)
}

export function getLegacyPlacement(dataSide) {
  return [...cachedPlacement(dataSide)]
}

export function placeLegacyBits(randomizedBits, dataSide) {
  if (typeof randomizedBits !== 'string' || /[^01]/u.test(randomizedBits)) {
    throw new TypeError('Legacy placement input must be a binary string')
  }
  if (randomizedBits.length !== dataSide * dataSide) {
    throw new RangeError(
      `The ${dataSide}x${dataSide} placement grid requires exactly ${dataSide * dataSide} bits`,
    )
  }

  const placement = cachedPlacement(dataSide)
  return Array.from({ length: dataSide }, (_, row) =>
    Array.from(
      { length: dataSide },
      (_, column) => randomizedBits[placement[row * dataSide + column]] === '1',
    ),
  )
}
