import { describe, expect, it } from 'vitest'
import { deathshroud, eradicators } from '../../domain/demoData'
import { defaultSandboxModifiers } from '../../domain/sandbox'
import { analyseSandbox } from './analyseSandbox'

describe('sandbox analysis', () => {
  it('derives thresholds and efficiency from the exact combat distribution', () => {
    const result = analyseSandbox({
      version: 1,
      attacker: eradicators,
      target: deathshroud,
      modifiers: defaultSandboxModifiers,
    })

    expect(result.expectedDamage).toBeGreaterThan(0)
    expect(result.thresholds.at(-1)).toMatchObject({ label: 'Destroy target', probability: result.killProbability })
    expect(result.damageDistribution.reduce((total, [, probability]) => total + probability, 0)).toBeCloseTo(1)
    expect(result.damagePerHundredPoints).toBeCloseTo(result.expectedDamage / 2)
  })

  it('applies common situational modifiers from the entered state', () => {
    const baseline = analyseSandbox({ version: 1, attacker: eradicators, target: deathshroud, modifiers: defaultSandboxModifiers })
    const modified = analyseSandbox({
      version: 1,
      attacker: eradicators,
      target: deathshroud,
      modifiers: { ...defaultSandboxModifiers, rerollHits: 'failed', damageReduction: 1 },
    })

    expect(modified.rulesTrace).toContain('Hit re-rolls: failed')
    expect(modified.rulesTrace).toContain('Damage reduction 1 applied per failed save, to a minimum of 1')
    expect(modified.expectedDamage).not.toBe(baseline.expectedDamage)
  })
})
