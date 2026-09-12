import { describe, expect, it } from 'vitest'
import { demoMyRoster, deathshroud } from '../domain/demoData'
import { targetProfile } from '../domain/profiles'
import { runAnalysis } from './runAnalysis'

describe('commitment analysis worker task', () => {
  it('analyses four attackers within the interactive performance budget', () => {
    const startedAt = performance.now()
    const result = runAnalysis({
      id: 'performance-test',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: demoMyRoster.units,
      selectedAttackerIds: demoMyRoster.units.map(({ id }) => id),
      requiredConfidence: 0.8,
      commandPoints: 2,
    })
    const elapsed = performance.now() - startedAt

    expect(result.attacks).toHaveLength(5)
    expect(result.optimisation.paretoFrontier.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(500)
  })
})
