import type { TargetProfile, WeaponProfile } from '../combat/types'
import { analyseCombat } from '../combat/analyseCombat'
import type { CommitmentAction, ResourceCost } from './types'

export const combatAction = (
  attackerId: string,
  weapon: WeaponProfile,
  target: TargetProfile,
  cost: ResourceCost,
): CommitmentAction<number> => ({
  id: weapon.id,
  attackerId,
  name: weapon.name,
  cost,
  legal: (remainingWounds) => remainingWounds > 0,
  transition: (remainingWounds) => analyseCombat({
    weapon,
    target,
    targetWoundsRemaining: remainingWounds,
  }).remainingWounds,
  observation: (remainingWounds) => remainingWounds === 0
    ? 'target destroyed'
    : `${remainingWounds} wounds remaining`,
})
