import type { CombatMode } from '../domain/combatState'
import type { UnitProfile, WeaponProfile } from '../domain/profiles'
import { analyseCombat } from '../engine/combat/analyseCombat'
import { configureWeapon } from '../engine/combat/configure'
import { expectation, mapDistribution, probabilityOf, type PMF } from '../engine/distributions/pmf'
import { combatSequenceAction } from '../engine/optimisation/combatAction'
import { optimiseCommitment } from '../engine/optimisation/optimise'
import type { CommitmentAction, ResourceCost } from '../engine/optimisation/types'
import type { AnalysisRequest, AttackSummary, CommitmentAnalysis } from './protocol'

const freeCost: ResourceCost = {
  activations: 1,
  commandPoints: 0,
  oncePerGameUses: [],
  expectedOverkill: 0,
}

const includesPhase = (mode: CombatMode, phase: 'shoot' | 'fight'): boolean =>
  mode === 'both' || mode === phase

const selectedWeapons = (
  unit: UnitProfile,
  request: AnalysisRequest,
): ReadonlyArray<WeaponProfile> => {
  const setup = request.attackerSetups[unit.id]
  if (setup === undefined) return []
  const ids = [
    includesPhase(request.mode, 'shoot') ? setup.shootWeaponId : null,
    includesPhase(request.mode, 'fight') ? setup.fightWeaponId : null,
  ].filter((id): id is NonNullable<typeof id> => id !== null)
  return ids.flatMap((id) => {
    const weapon = unit.weapons.find(({ id: weaponId }) => weaponId === id)
    return weapon === undefined ? [] : [configureWeapon(weapon, setup.modelCount, setup.modifiers)]
  })
}

const quantile = (distribution: PMF<number>, threshold: number): number => {
  let cumulative = 0
  for (const [value, probability] of [...distribution].sort(([left], [right]) => left - right)) {
    cumulative += probability
    if (cumulative >= threshold) return value
  }
  return [...distribution.keys()].sort((left, right) => right - left)[0] ?? 0
}

export const runAnalysis = (
  request: AnalysisRequest,
  onProgress: (completed: number, total: number) => void = () => undefined,
): CommitmentAnalysis => {
  const selected = new Set(request.selectedAttackerIds)
  const attackers = request.attackers.filter((unit) => selected.has(unit.id))
  const actions: Array<CommitmentAction<number>> = []
  const summaries: Array<AttackSummary> = []

  attackers.forEach((unit, index) => {
    onProgress(index, attackers.length)
    const setup = request.attackerSetups[unit.id]
    const weapons = selectedWeapons(unit, request)
    if (setup === undefined || weapons.length === 0) return
    const action = combatSequenceAction(unit.id, unit.name, weapons, request.target, freeCost)
    const remainingWounds = action.transition(request.targetWoundsRemaining)
    const damage = mapDistribution(remainingWounds, (remaining) => request.targetWoundsRemaining - remaining)
    actions.push(action)
    summaries.push({
      actionId: action.id,
      attackerId: unit.id,
      attackerName: unit.name,
      weaponName: weapons.map(({ name }) => name).join(' + '),
      killProbability: probabilityOf(remainingWounds, (remaining) => remaining === 0),
      expectedDamage: expectation(damage, (value) => value),
      typicalDamageLow: quantile(damage, 0.1),
      typicalDamageHigh: quantile(damage, 0.9),
      rulesTrace: [
        `${setup.modelCount} model${setup.modelCount === 1 ? '' : 's'} using ${weapons.map(({ name }) => name).join(' then ')}`,
        ...weapons.flatMap((weapon) => analyseCombat({
          weapon,
          target: request.target,
          targetWoundsRemaining: request.targetWoundsRemaining,
        }).rulesTrace),
      ],
      remainingWounds: [...remainingWounds],
    })
  })

  const optimisation = optimiseCommitment({
    initialState: request.targetWoundsRemaining,
    actions,
    goal: (remainingWounds) => remainingWounds === 0,
    requiredConfidence: request.requiredConfidence,
    maxDepth: 3,
    probabilityResolution: 0.01,
  })

  return {
    optimisation,
    attacks: summaries,
    alternatives: optimisation.paretoFrontier,
    unsupportedRules: [...new Set([
      ...attackers.flatMap(({ unsupportedRules }) => unsupportedRules),
      ...request.targetUnsupportedRules,
    ])],
    mode: request.mode,
  }
}
