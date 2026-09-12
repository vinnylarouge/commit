import { describe, expect, it } from 'vitest'
import {
  condition,
  convolve,
  createPmf,
  expectation,
  flatMapDistribution,
  mapDistribution,
  pointMass,
  probabilityOf,
} from './pmf'

describe('finite distributions', () => {
  const coin = createPmf([['heads', 1], ['tails', 1]] as const)

  it('normalises weights', () => {
    expect(coin.get('heads')).toBe(0.5)
    expect(coin.get('tails')).toBe(0.5)
  })

  it('maps and merges equal outcomes', () => {
    expect(mapDistribution(coin, () => 'same')).toEqual(pointMass('same'))
  })

  it('flat maps dependent outcomes', () => {
    const result = flatMapDistribution(coin, (side) => pointMass(side === 'heads' ? 1 : 2))
    expect(result.get(1)).toBe(0.5)
    expect(result.get(2)).toBe(0.5)
  })

  it('convolves independent distributions', () => {
    const sum = convolve(createPmf([[1, 1], [2, 1]]), createPmf([[1, 1], [2, 1]]), (a, b) => a + b)
    expect(sum.get(2)).toBe(0.25)
    expect(sum.get(3)).toBe(0.5)
    expect(sum.get(4)).toBe(0.25)
  })

  it('conditions, queries and takes expectations', () => {
    const die = createPmf(Array.from({ length: 6 }, (_, index) => [index + 1, 1] as const))
    expect(condition(die, (roll) => roll >= 5).size).toBe(2)
    expect(probabilityOf(die, (roll) => roll >= 5)).toBeCloseTo(1 / 3)
    expect(expectation(die, (roll) => roll)).toBeCloseTo(3.5)
  })

  it('rejects empty probability mass', () => {
    expect(() => createPmf([])).toThrow(RangeError)
  })
})
