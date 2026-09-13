import type { UnitProfile, WeaponProfile } from '../domain/profiles'
import { analyseCombat } from '../engine/combat/analyseCombat'
import { probabilityOf } from '../engine/distributions/pmf'
import { combatAction } from '../engine/optimisation/combatAction'
import { optimiseCommitment } from '../engine/optimisation/optimise'
import type { CommitmentAction, ResourceCost } from '../engine/optimisation/types'
import type { AnalysisRequest, AttackSummary, CommitmentAnalysis } from './protocol'

const freeCost: ResourceCost = {
  activations: 1,
  commandPoints: 0,
  oncePerGameUses: [],
  expectedOverkill: 0,
}

const boostedProfile = (weapon: WeaponProfile): WeaponProfile => ({
  ...weapon,
  id: `${weapon.id}:cp` as WeaponProfile['id'],
  rules: { ...weapon.rules, rerollHits: 'failed' },
})

const actionFor = (
  unit: UnitProfile,
  weapon: WeaponProfile,
  request: AnalysisRequest,
  commandPoints: number,
): CommitmentAction<number> => {
  const profile = commandPoints === 0 ? weapon : boostedProfile(weapon)
  const action = combatAction(unit.id, profile, request.target, {
    ...freeCost,
    commandPoints,
    oncePerGameUses: commandPoints === 0 ? [] : ['command-reroll'],
  })
  return {
    ...action,
    id: commandPoints === 0 ? unit.id : `${unit.id}:cp`,
    name: commandPoints === 0 ? unit.name : `${unit.name} with 1 CP`,
  }
}

export const runAnalysis = (
  request: AnalysisRequest,
  onProgress: (completed: number, total: number) => void = () => undefined,
): CommitmentAnalysis => {
  const selected = new Set(request.selectedAttackerIds)
  const attackers = request.attackers.filter((unit) => selected.has(unit.id) && unit.weapons.length > 0)
  const actions: Array<CommitmentAction<number>> = []
  const summaries: Array<AttackSummary> = []

  attackers.forEach((unit, index) => {
    onProgress(index, attackers.length)
    const weapon = unit.weapons[0]
    if (weapon === undefined) return
    const analysis = analyseCombat({
      weapon,
      target: request.target,
      targetWoundsRemaining: request.targetWoundsRemaining,
    })
    actions.push(actionFor(unit, weapon, request, 0))
    if (request.commandPoints > 0 && index === 0) actions.push(actionFor(unit, weapon, request, 1))
    summaries.push({
      actionId: unit.id,
      attackerId: unit.id,
      attackerName: unit.name,
      weaponName: weapon.name,
      killProbability: analysis.killProbability,
      expectedDamage: analysis.expectedDamage,
      rulesTrace: analysis.rulesTrace,
      remainingWounds: [...analysis.remainingWounds],
      commandPoints: 0,
      goalProbability: probabilityOf(analysis.remainingWounds, (remaining) => remaining <= request.goalWoundsRemaining),
    })
    if (request.commandPoints > 0 && index === 0) {
      const boosted = analyseCombat({
        weapon: boostedProfile(weapon),
        target: request.target,
        targetWoundsRemaining: request.targetWoundsRemaining,
      })
      summaries.push({
        actionId: `${unit.id}:cp`,
        attackerId: unit.id,
        attackerName: unit.name,
        weaponName: weapon.name,
        killProbability: boosted.killProbability,
        expectedDamage: boosted.expectedDamage,
        rulesTrace: boosted.rulesTrace,
        remainingWounds: [...boosted.remainingWounds],
        commandPoints: 1,
        goalProbability: probabilityOf(boosted.remainingWounds, (remaining) => remaining <= request.goalWoundsRemaining),
      })
    }
  })

  const optimisation = optimiseCommitment({
    initialState: request.targetWoundsRemaining,
    actions,
    goal: (remainingWounds) => remainingWounds <= request.goalWoundsRemaining,
    requiredConfidence: request.requiredConfidence,
    commandPointsAvailable: request.commandPoints,
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
    goalLabel: request.goalLabel,
  }
}
