import { describe, expect, it } from 'vitest'
import { demoMyRoster, demoOpponentRoster } from '../../domain/demoData'
import { analyseMatchup } from './analyseMatchup'

describe('pre-game matchup analysis', () => {
  it('compares complete attacker and target profiles with efficiency metrics', () => {
    const result = analyseMatchup(demoMyRoster.units, demoOpponentRoster.units)

    expect(result.cells).toHaveLength(16)
    expect(result.bestByTarget).toHaveLength(4)
    expect(result.bestByTarget.every(({ attacker }) => attacker !== null)).toBe(true)
    expect(result.cells.every(({ expectedDamage }) => Number.isFinite(expectedDamage))).toBe(true)
    expect(result.cells.every(({ enemyPointsPerHundredPoints }) => enemyPointsPerHundredPoints >= 0)).toBe(true)
  })
})
