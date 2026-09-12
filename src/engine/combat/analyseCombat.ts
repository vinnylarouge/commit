import { evaluateDice } from '../dice/dice'
import {
  expectation,
  flatMapDistribution,
  probabilityOf,
} from '../distributions/pmf'
import { remainingWoundsDistribution } from '../../rules/core/damage'
import { hitTallyDistribution } from '../../rules/core/hit'
import { failedSaveDistribution } from '../../rules/core/save'
import { woundTallyDistribution } from '../../rules/core/wound'
import { buildRulesTrace } from '../../rules/trace'
import type { CombatAnalysis, CombatRequest } from './types'

export const analyseCombat = (request: CombatRequest): CombatAnalysis => {
  const { weapon, target } = request
  if (!Number.isInteger(target.models) || target.models <= 0) {
    throw new RangeError('Target models must be a positive integer')
  }
  if (!Number.isInteger(target.woundsPerModel) || target.woundsPerModel <= 0) {
    throw new RangeError('Wounds per model must be a positive integer')
  }

  const maximumWounds = target.models * target.woundsPerModel
  const initialWounds = request.targetWoundsRemaining ?? maximumWounds

  if (!Number.isInteger(initialWounds) || initialWounds < 0 || initialWounds > maximumWounds) {
    throw new RangeError('Target wounds remaining must fit the target profile')
  }

  const attacks = evaluateDice(weapon.attacks)
  const hitTallies = flatMapDistribution(attacks, (attackCount) =>
    hitTallyDistribution(attackCount, weapon),
  )
  const woundTallies = flatMapDistribution(hitTallies, (hitTally) =>
    woundTallyDistribution(hitTally, weapon, target),
  )
  const damageInstances = flatMapDistribution(woundTallies, (woundTally) =>
    failedSaveDistribution(woundTally, target, weapon.armourPenetration),
  )
  const remainingWounds = flatMapDistribution(damageInstances, (instanceCount) =>
    remainingWoundsDistribution(
      initialWounds,
      target.woundsPerModel,
      instanceCount,
      weapon.damage,
      target.feelNoPain,
    ),
  )

  return {
    method: { kind: 'exact' },
    remainingWounds,
    killProbability: probabilityOf(remainingWounds, (wounds) => wounds === 0),
    expectedDamage: initialWounds - expectation(remainingWounds, (wounds) => wounds),
    stages: { attacks, hitTallies, woundTallies, damageInstances },
    rulesTrace: buildRulesTrace(request),
  }
}
