import type { TargetProfile, WeaponProfile } from '../combat/types'
import { analyseCombat } from '../combat/analyseCombat'
import { flatMapDistribution, pointMass, type PMF } from '../distributions/pmf'
import type { CommitmentAction, ResourceCost } from './types'

export const combatAction = (
  attackerId: string,
  weapon: WeaponProfile,
  target: TargetProfile,
  cost: ResourceCost,
): CommitmentAction<number> => {
  const transitions = new Map<number, PMF<number>>()
  return {
    id: weapon.id,
    attackerId,
    name: weapon.name,
    cost,
    legal: (remainingWounds) => remainingWounds > 0,
    transition: (remainingWounds) => {
      const cached = transitions.get(remainingWounds)
      if (cached !== undefined) return cached
      const distribution = analyseCombat({
        weapon,
        target,
        targetWoundsRemaining: remainingWounds,
      }).remainingWounds
      transitions.set(remainingWounds, distribution)
      return distribution
    },
    observation: (remainingWounds) => remainingWounds === 0
      ? 'target destroyed'
      : `${remainingWounds} wounds remaining`,
  }
}

export const combatSequenceAction = (
  attackerId: string,
  name: string,
  weapons: ReadonlyArray<WeaponProfile>,
  target: TargetProfile,
  cost: ResourceCost,
): CommitmentAction<number> => {
  const transitions = new Map<number, PMF<number>>()
  return {
    id: `${attackerId}:${weapons.map(({ id }) => id).join('+')}`,
    attackerId,
    name,
    cost,
    legal: (remainingWounds) => remainingWounds > 0 && weapons.length > 0,
    transition: (remainingWounds) => {
      const cached = transitions.get(remainingWounds)
      if (cached !== undefined) return cached
      let distribution = pointMass(remainingWounds)
      for (const weapon of weapons) {
        distribution = flatMapDistribution(distribution, (currentWounds) => currentWounds === 0
          ? pointMass(0)
          : analyseCombat({ weapon, target, targetWoundsRemaining: currentWounds }).remainingWounds)
      }
      transitions.set(remainingWounds, distribution)
      return distribution
    },
    observation: (remainingWounds) => remainingWounds === 0
      ? 'target destroyed'
      : `${remainingWounds} wounds remaining`,
  }
}
