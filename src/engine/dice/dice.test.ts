import { describe, expect, it } from 'vitest'
import { evaluateDice, rollDice, uniformDie } from './dice'

describe('exact dice distributions', () => {
  it('builds a uniform d6', () => {
    const d6 = uniformDie(6)
    expect(d6.size).toBe(6)
    for (let face = 1; face <= 6; face += 1) {
      expect(d6.get(face)).toBeCloseTo(1 / 6)
    }
  })

  it('builds the 2d6 triangular distribution', () => {
    const twoD6 = rollDice(2)
    expect(twoD6.get(2)).toBeCloseTo(1 / 36)
    expect(twoD6.get(7)).toBeCloseTo(6 / 36)
    expect(twoD6.get(12)).toBeCloseTo(1 / 36)
  })

  it('supports constants and modified dice without negative results', () => {
    expect(evaluateDice({ kind: 'constant', value: 4 }).get(4)).toBe(1)
    const d6MinusTwo = evaluateDice({ kind: 'die', count: 1, sides: 6, modifier: -2 })
    expect(d6MinusTwo.get(0)).toBeCloseTo(2 / 6)
    expect(d6MinusTwo.get(4)).toBeCloseTo(1 / 6)
  })
})
