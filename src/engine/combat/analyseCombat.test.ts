import { describe, expect, it } from 'vitest'
import { unitId, weaponId, type CombatRequest } from './types'
import { analyseCombat } from './analyseCombat'

const baseRequest = (): CombatRequest => ({
  weapon: {
    id: weaponId('golden-weapon'),
    name: 'Golden weapon',
    attacks: { kind: 'constant', value: 1 },
    skill: 3,
    strength: 6,
    armourPenetration: -1,
    damage: { kind: 'constant', value: 2 },
    keywords: [],
  },
  target: {
    id: unitId('golden-target'),
    name: 'Golden target',
    models: 1,
    toughness: 5,
    armourSave: 4,
    invulnerableSave: null,
    woundsPerModel: 2,
    feelNoPain: null,
    benefitOfCover: false,
  },
})

describe('exact combat analysis golden cases', () => {
  it('resolves hit, wound, save and lethal damage exactly', () => {
    const analysis = analyseCombat(baseRequest())
    expect(analysis.method).toEqual({ kind: 'exact' })
    expect(analysis.killProbability).toBeCloseTo(8 / 27)
    expect(analysis.expectedDamage).toBeCloseTo(16 / 27)
  })

  it('improves the exact result with failed-hit rerolls', () => {
    const request = baseRequest()
    const analysis = analyseCombat({
      ...request,
      weapon: { ...request.weapon, rules: { rerollHits: 'failed' } },
    })
    expect(analysis.killProbability).toBeCloseTo((8 / 9) * (4 / 6) * (4 / 6))
  })

  it('uses variable attack distributions without simulation noise', () => {
    const request = baseRequest()
    const analysis = analyseCombat({
      ...request,
      weapon: {
        ...request.weapon,
        attacks: { kind: 'die', count: 1, sides: 6, modifier: 0 },
      },
    })
    expect(analysis.stages.attacks.size).toBe(6)
    expect(analysis.method.kind).toBe('exact')
    expect([...analysis.remainingWounds.values()].reduce((sum, probability) => sum + probability, 0)).toBeCloseTo(1)
    expect([...analysis.remainingWounds.keys()].every((wounds) => wounds >= 0 && wounds <= 2)).toBe(true)
  })

  it('supports a partially damaged target', () => {
    const request = baseRequest()
    const analysis = analyseCombat({ ...request, targetWoundsRemaining: 1 })
    expect(analysis.killProbability).toBeCloseTo(8 / 27)
    expect(analysis.expectedDamage).toBeCloseTo(8 / 27)
  })

  it('keeps multi-model overkill from spilling', () => {
    const request = baseRequest()
    const analysis = analyseCombat({
      weapon: {
        ...request.weapon,
        attacks: { kind: 'constant', value: 1 },
        damage: { kind: 'constant', value: 4 },
      },
      target: {
        ...request.target,
        models: 2,
        woundsPerModel: 3,
      },
    })
    expect(analysis.remainingWounds.has(3)).toBe(true)
    expect(analysis.killProbability).toBe(0)
  })

  it('generates the rules trace from the analysed parameters', () => {
    const trace = analyseCombat(baseRequest()).rulesTrace.join('\n')
    expect(trace).toContain('Golden weapon: 1 attacks')
    expect(trace).toContain('Hit on 3+')
    expect(trace).toContain('Strength 6 into Toughness 5: wound on 3+')
    expect(trace).toContain('AP -1: effective save 5+')
    expect(trace).toContain('Damage 2')
  })

  it('rejects impossible target state', () => {
    expect(() => analyseCombat({ ...baseRequest(), targetWoundsRemaining: 3 })).toThrow(RangeError)
  })
})
