import { describe, expect, it } from 'vitest'
import type { TargetProfile, WeaponProfile } from '../../engine/combat/types'
import { unitId, weaponId } from '../../engine/combat/types'
import { damageAfterFeelNoPain, allocateDamage, remainingWoundsDistribution } from './damage'
import { hitTallyDistribution } from './hit'
import { effectiveSaveTarget, failedSaveDistribution } from './save'
import { woundTallyDistribution, woundTarget } from './wound'

const weapon = (overrides: Partial<WeaponProfile> = {}): WeaponProfile => ({
  id: weaponId('test-weapon'),
  name: 'Test weapon',
  attacks: { kind: 'constant', value: 1 },
  skill: 3,
  strength: 5,
  armourPenetration: -1,
  damage: { kind: 'constant', value: 2 },
  ...overrides,
  keywords: overrides.keywords ?? [],
})

const target = (overrides: Partial<TargetProfile> = {}): TargetProfile => ({
  id: unitId('test-target'),
  name: 'Test target',
  models: 2,
  toughness: 5,
  armourSave: 3,
  invulnerableSave: null,
  woundsPerModel: 3,
  feelNoPain: null,
  benefitOfCover: false,
  ...overrides,
})

describe('hit rules', () => {
  it('counts ordinary hits', () => {
    const result = hitTallyDistribution(1, weapon())
    expect(result.get('0:0')).toBeCloseTo(2 / 6)
    expect(result.get('1:0')).toBeCloseTo(4 / 6)
  })

  it('separates lethal hits and sustained critical hits', () => {
    const result = hitTallyDistribution(1, weapon({
      rules: { lethalHits: true, sustainedHits: 1 },
    }))
    expect(result.get('0:0')).toBeCloseTo(2 / 6)
    expect(result.get('1:0')).toBeCloseTo(3 / 6)
    expect(result.get('1:1')).toBeCloseTo(1 / 6)
  })

  it('combines repeated attack outcomes', () => {
    const result = hitTallyDistribution(2, weapon())
    expect(result.get('0:0')).toBeCloseTo(4 / 36)
    expect(result.get('1:0')).toBeCloseTo(16 / 36)
    expect(result.get('2:0')).toBeCloseTo(16 / 36)
  })
})

describe('wound rules', () => {
  it.each([
    [10, 5, 2],
    [6, 5, 3],
    [5, 5, 4],
    [4, 5, 5],
    [5, 10, 6],
  ])('maps Strength %i versus Toughness %i to %i+', (strength, toughness, expected) => {
    expect(woundTarget(strength, toughness)).toBe(expected)
  })

  it('separates devastating critical wounds', () => {
    const result = woundTallyDistribution(
      '1:0',
      weapon({ rules: { devastatingWounds: true } }),
      target(),
    )
    expect(result.get('0:0')).toBeCloseTo(3 / 6)
    expect(result.get('1:0')).toBeCloseTo(2 / 6)
    expect(result.get('0:1')).toBeCloseTo(1 / 6)
  })

  it('passes lethal hits directly to the saveable pool', () => {
    expect(woundTallyDistribution('0:2', weapon(), target()).get('2:0')).toBe(1)
  })
})

describe('save rules', () => {
  it('uses an invulnerable save when armour penetration is worse', () => {
    const defender = target({ armourSave: 2, invulnerableSave: 4 })
    expect(effectiveSaveTarget(defender, -4)).toBe(4)
    expect(failedSaveDistribution('1:0', defender, -4).get(1)).toBeCloseTo(3 / 6)
  })

  it('applies cover to the armour save', () => {
    expect(effectiveSaveTarget(target({ benefitOfCover: true }), -1)).toBe(3)
  })

  it('does not improve a 3+ armour save against AP 0 with cover', () => {
    expect(effectiveSaveTarget(target({ benefitOfCover: true }), 0)).toBe(3)
  })

  it('automatically carries devastating wounds into damage', () => {
    expect(failedSaveDistribution('0:2', target(), -1).get(2)).toBe(1)
  })

  it('supports save-roll modifiers and re-rolling failed saves', () => {
    const modified = { ...target(), saveModifier: -1, rerollSaves: 'failed' as const }
    expect(failedSaveDistribution('1:0', modified, 0).get(0)).toBeCloseTo(3 / 4)
    expect(failedSaveDistribution('1:0', modified, 0).get(1)).toBeCloseTo(1 / 4)
  })
})

describe('damage and allocation rules', () => {
  it('does not spill ordinary attack damage between models', () => {
    expect(allocateDamage(6, 3, 2)).toBe(4)
    expect(allocateDamage(4, 3, 2)).toBe(3)
  })

  it('allocates separate damage instances in order', () => {
    const result = remainingWoundsDistribution(
      6,
      3,
      2,
      { kind: 'constant', value: 2 },
      null,
    )
    expect(result.get(3)).toBe(1)
  })

  it('kills two three-wound models with two three-damage instances', () => {
    expect(remainingWoundsDistribution(
      6,
      3,
      2,
      { kind: 'constant', value: 3 },
      null,
    ).get(0)).toBe(1)
  })

  it('applies Feel No Pain to each point of damage', () => {
    const result = damageAfterFeelNoPain(3, 5)
    expect(result.get(0)).toBeCloseTo(1 / 27)
    expect(result.get(1)).toBeCloseTo(6 / 27)
    expect(result.get(2)).toBeCloseTo(12 / 27)
    expect(result.get(3)).toBeCloseTo(8 / 27)
  })

  it('applies damage reduction after rolling, to a minimum of one', () => {
    const result = remainingWoundsDistribution(
      3,
      3,
      1,
      { kind: 'die', count: 1, sides: 3, modifier: 0 },
      null,
      2,
    )
    expect([...result]).toEqual([[2, 1]])
  })
})
