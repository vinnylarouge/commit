import { describe, expect, it } from 'vitest'
import { demoMyRoster, deathshroud } from '../domain/demoData'
import { presentCommitment } from '../domain/plans'
import { targetProfile } from '../domain/profiles'
import { setupForUnit } from '../stores/game'
import { runAnalysis } from './runAnalysis'

const attackerSetups = Object.fromEntries(demoMyRoster.units.map((unit) => [unit.id, setupForUnit(unit)]))

describe('commitment analysis worker task', () => {
  it('analyses four configured shooting units and returns damage ranges', () => {
    const result = runAnalysis({
      id: 'shooting-plan',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: demoMyRoster.units,
      selectedAttackerIds: demoMyRoster.units.map(({ id }) => id),
      attackerSetups,
      mode: 'shoot',
      requiredConfidence: 0.8,
      targetUnsupportedRules: deathshroud.unsupportedRules,
    })
    expect(result.attacks).toHaveLength(4)
    expect(result.attacks[0]?.typicalDamageHigh).toBeGreaterThanOrEqual(result.attacks[0]?.typicalDamageLow ?? 100)
    expect(result.optimisation.paretoFrontier.length).toBeGreaterThan(0)
  })

  it('combines the selected shooting and fight weapons for each unit', () => {
    const unit = demoMyRoster.units[0]
    if (unit === undefined) throw new Error('Demo fixture is empty')
    const shooting = runAnalysis({
      id: 'shoot-only',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: [unit],
      selectedAttackerIds: [unit.id],
      attackerSetups: { [unit.id]: setupForUnit(unit) },
      mode: 'shoot',
      requiredConfidence: 0.6,
      targetUnsupportedRules: [],
    })
    const both = runAnalysis({
      id: 'both',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: [unit],
      selectedAttackerIds: [unit.id],
      attackerSetups: { [unit.id]: setupForUnit(unit) },
      mode: 'both',
      requiredConfidence: 0.6,
      targetUnsupportedRules: [],
    })

    expect(both.attacks[0]?.weaponName).toContain(' + ')
    expect(both.attacks[0]?.expectedDamage).toBeGreaterThan(shooting.attacks[0]?.expectedDamage ?? 100)
  })

  it('labels a best-effort plan without advising the player to hold fire', () => {
    const unit = demoMyRoster.units[0]
    if (unit === undefined) throw new Error('Demo fixture is empty')
    const view = presentCommitment(runAnalysis({
      id: 'best-effort',
      kind: 'optimise-commitment',
      target: targetProfile(deathshroud),
      targetWoundsRemaining: 9,
      attackers: [unit],
      selectedAttackerIds: [unit.id],
      attackerSetups: { [unit.id]: setupForUnit(unit) },
      mode: 'shoot',
      requiredConfidence: 1,
      targetUnsupportedRules: [],
    }))

    expect(view.kind).toBe('impossible')
    expect(view.headline).toBe('Eradicators first')
    expect(view.commitmentAdvice).toBe('Below your confidence target')
  })
})
