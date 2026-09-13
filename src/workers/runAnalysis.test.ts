import { describe, expect, it } from 'vitest'
import { demoMyRoster, deathshroud } from '../domain/demoData'
import { targetProfile } from '../domain/profiles'
import { runAnalysis } from './runAnalysis'

describe('commitment analysis worker task', () => {
  it('keeps a four-attacker analysis within a bounded interactive budget under test load', () => {
    const result = runAnalysis({
      id: 'performance-test',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: demoMyRoster.units,
      selectedAttackerIds: demoMyRoster.units.map(({ id }) => id),
      requiredConfidence: 0.8,
      commandPoints: 2,
      goalWoundsRemaining: 0,
      goalLabel: 'Kill unit',
      targetUnsupportedRules: deathshroud.unsupportedRules,
    })
    expect(result.attacks).toHaveLength(5)
    expect(result.optimisation.paretoFrontier.length).toBeGreaterThan(0)
  })

  it('optimises a damage goal instead of silently treating it as a kill', () => {
    const result = runAnalysis({
      id: 'damage-goal',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: demoMyRoster.units.slice(0, 1),
      selectedAttackerIds: demoMyRoster.units.slice(0, 1).map(({ id }) => id),
      requiredConfidence: 0.6,
      commandPoints: 0,
      goalWoundsRemaining: 6,
      goalLabel: 'Deal ≥ 3 wounds',
      targetUnsupportedRules: [],
    })

    expect(result.goalLabel).toBe('Deal ≥ 3 wounds')
    expect(result.attacks[0]?.goalProbability).toBeGreaterThan(result.attacks[0]?.killProbability ?? 1)
  })
})
