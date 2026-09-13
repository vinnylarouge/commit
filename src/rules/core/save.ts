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
  const modifier = target.saveModifier ?? 0
  const reroll = target.rerollSaves ?? 'none'
  const saved = (face: number): boolean => face !== 1 && face + modifier >= required
  const outcomes: Array<readonly [number, number]> = []
  for (let first = 1; first <= 6; first += 1) {
    const shouldReroll = reroll === 'failed' ? !saved(first) : reroll === 'ones' && first === 1
    if (!shouldReroll) {
      outcomes.push([saved(first) ? 0 : 1, 1 / 6])
      continue
    }
    for (let second = 1; second <= 6; second += 1) {
      outcomes.push([saved(second) ? 0 : 1, 1 / 36])
    }
  }
  const singleSave = createPmf(outcomes)
  return repeatDistribution(
    saveableWounds,
    devastatingWounds,
    singleSave,
    (failed, nextFailure) => failed + nextFailure,
  )
}
