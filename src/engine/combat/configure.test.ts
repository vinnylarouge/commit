import { describe, expect, it } from 'vitest'
import { deathshroud, eradicators } from '../../domain/demoData'
import { configureTarget, configureWeapon, scaleDice } from './configure'

describe('pre-game profile configuration', () => {
  it('scales attacks per model, including dice modifiers', () => {
    expect(scaleDice({ kind: 'constant', value: 2 }, 5)).toEqual({ kind: 'constant', value: 10 })
    expect(scaleDice({ kind: 'die', count: 1, sides: 6, modifier: 1 }, 3)).toEqual({
      kind: 'die', count: 3, sides: 6, modifier: 3,
    })
  })

  it('applies attacker conditions without dropping profile rules', () => {
    const weapon = eradicators.weapons[0]
    if (weapon === undefined) throw new Error('Demo fixture is empty')
    const configured = configureWeapon(weapon, 3, {
      hitModifier: 1,
      woundModifier: -1,
      rerollHits: 'profile',
      rerollWounds: 'failed',
      lethalHits: true,
      sustainedHits: 1,
      devastatingWounds: false,
    })
    expect(configured.attacks).toEqual({ kind: 'constant', value: 6 })
    expect(configured.rules).toMatchObject({
      hitModifier: 1,
      woundModifier: -1,
      rerollHits: 'ones',
      rerollWounds: 'failed',
      lethalHits: true,
      sustainedHits: 1,
    })
  })

  it('applies defender conditions and explicit save overrides', () => {
    const configured = configureTarget(deathshroud, {
      modelCount: 2,
      toughnessModifier: 2,
      saveModifier: -1,
      rerollSaves: 'failed',
      benefitOfCover: true,
      invulnerableSave: 5,
      feelNoPain: 4,
    })
    expect(configured).toMatchObject({
      models: 2,
      toughness: deathshroud.toughness + 2,
      saveModifier: -1,
      rerollSaves: 'failed',
      benefitOfCover: true,
      invulnerableSave: 5,
      feelNoPain: 4,
    })
  })
})
