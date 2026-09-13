import { evaluateDice, type DiceExpr } from '../../engine/dice/dice'
import {
  createPmf,
  flatMapDistribution,
  mapDistribution,
  pointMass,
  repeatDistribution,
  type PMF,
} from '../../engine/distributions/pmf'

export const damageAfterFeelNoPain = (
  damage: number,
  feelNoPain: number | null,
): PMF<number> => {
  if (feelNoPain === null) return pointMass(damage)
  if (!Number.isInteger(feelNoPain) || feelNoPain < 2 || feelNoPain > 6) {
    throw new RangeError('Feel No Pain must be null or an integer from 2 to 6')
  }

  const ignoredFaces = 7 - feelNoPain
  const singlePoint = createPmf([
    [0, ignoredFaces],
    [1, 6 - ignoredFaces],
  ])
  return repeatDistribution(damage, 0, singlePoint, (suffered, point) => suffered + point)
}

export const allocateDamage = (
  totalWoundsRemaining: number,
  woundsPerModel: number,
  damage: number,
): number => {
  if (totalWoundsRemaining <= 0) return 0
  const remainder = totalWoundsRemaining % woundsPerModel
  const woundsOnCurrentModel = remainder === 0 ? woundsPerModel : remainder
  return totalWoundsRemaining - Math.min(woundsOnCurrentModel, damage)
}

export const remainingWoundsDistribution = (
  initialWounds: number,
  woundsPerModel: number,
  damageInstances: number,
  damage: DiceExpr,
  feelNoPain: number | null,
  damageReduction = 0,
): PMF<number> => {
  if (!Number.isInteger(damageReduction) || damageReduction < 0) {
    throw new RangeError('Damage reduction must be a non-negative integer')
  }
  const rawDamage = evaluateDice(damage)
  let remaining = pointMass(initialWounds)

  for (let index = 0; index < damageInstances; index += 1) {
    remaining = flatMapDistribution(remaining, (currentWounds) =>
      flatMapDistribution(rawDamage, (rolledDamage) =>
        mapDistribution(
          damageAfterFeelNoPain(rolledDamage === 0 ? 0 : Math.max(1, rolledDamage - damageReduction), feelNoPain),
          (sufferedDamage) => allocateDamage(currentWounds, woundsPerModel, sufferedDamage),
        ),
      ),
    )
  }
  return remaining
}
