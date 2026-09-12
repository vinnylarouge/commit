import {
  createPmf,
  repeatDistribution,
  type PMF,
} from '../../engine/distributions/pmf'
import type { TargetProfile } from '../../engine/combat/types'
import { decodeWoundTally } from './wound'

export const effectiveSaveTarget = (
  target: TargetProfile,
  armourPenetration: number,
): number => {
  const coverApplies = target.benefitOfCover && (armourPenetration !== 0 || target.armourSave > 3)
  const coverBonus = coverApplies ? 1 : 0
  const armourTarget = target.armourSave - armourPenetration - coverBonus
  return target.invulnerableSave === null
    ? armourTarget
    : Math.min(armourTarget, target.invulnerableSave)
}

export const failedSaveDistribution = (
  woundTallyKey: string,
  target: TargetProfile,
  armourPenetration: number,
): PMF<number> => {
  const { saveableWounds, devastatingWounds } = decodeWoundTally(woundTallyKey)
  const required = effectiveSaveTarget(target, armourPenetration)
  let failedFaces = 0
  for (let face = 1; face <= 6; face += 1) {
    const saved = face !== 1 && face >= required
    if (!saved) failedFaces += 1
  }

  const singleSave = createPmf([
    [0, 6 - failedFaces],
    [1, failedFaces],
  ])
  return repeatDistribution(
    saveableWounds,
    devastatingWounds,
    singleSave,
    (failed, nextFailure) => failed + nextFailure,
  )
}
