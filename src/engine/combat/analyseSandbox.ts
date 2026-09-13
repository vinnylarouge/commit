import type { SandboxState } from '../../domain/sandbox'
import { targetProfile } from '../../domain/profiles'
import { probabilityOf } from '../distributions/pmf'
import { analyseCombat } from './analyseCombat'

export type SandboxAnalysis = Readonly<{
  expectedDamage: number
  killProbability: number
  damagePerHundredPoints: number
  killProbabilityPerHundredPoints: number
  thresholds: ReadonlyArray<Readonly<{ label: string; probability: number }>>
  damageDistribution: ReadonlyArray<readonly [number, number]>
  rulesTrace: ReadonlyArray<string>
}>

export const analyseSandbox = (state: SandboxState): SandboxAnalysis => {
  const weapon = state.attacker.weapons[0]
  if (weapon === undefined) throw new Error('Add a weapon to the attacker before analysing.')
  const modifiedWeapon = {
    ...weapon,
    rules: {
      ...weapon.rules,
      hitModifier: state.modifiers.hitModifier,
      woundModifier: state.modifiers.woundModifier,
      rerollHits: state.modifiers.rerollHits,
      rerollWounds: state.modifiers.rerollWounds,
      lethalHits: state.modifiers.lethalHits,
      sustainedHits: state.modifiers.sustainedHits,
      devastatingWounds: state.modifiers.devastatingWounds,
    },
  }
  const target = targetProfile(state.target, state.modifiers.benefitOfCover)
  const targetWounds = target.models * target.woundsPerModel
  const result = analyseCombat({ weapon: modifiedWeapon, target, damageReduction: state.modifiers.damageReduction })
  const thresholdValues = [...new Set([1, Math.ceil(targetWounds / 2), targetWounds])]
  const pointScale = state.attacker.points > 0 ? 100 / state.attacker.points : 0
  return {
    expectedDamage: result.expectedDamage,
    killProbability: result.killProbability,
    damagePerHundredPoints: result.expectedDamage * pointScale,
    killProbabilityPerHundredPoints: result.killProbability * pointScale,
    thresholds: thresholdValues.map((damage) => ({
      label: damage === targetWounds ? 'Destroy target' : `Deal ${damage}+ damage`,
      probability: probabilityOf(result.remainingWounds, (remaining) => targetWounds - remaining >= damage),
    })),
    damageDistribution: [...result.remainingWounds]
      .map(([remaining, probability]) => [targetWounds - remaining, probability] as const)
      .sort(([left], [right]) => left - right),
    rulesTrace: result.rulesTrace,
  }
}
