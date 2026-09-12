import { checkD6 } from '../../engine/dice/d6Check'
import {
  flatMapDistribution,
  mapDistribution,
  pointMass,
  type PMF,
} from '../../engine/distributions/pmf'
import type { TargetProfile, WeaponProfile } from '../../engine/combat/types'
import { decodeHitTally } from './hit'

export type WoundTally = Readonly<{
  saveableWounds: number
  devastatingWounds: number
}>

export const woundTarget = (strength: number, toughness: number): number => {
  if (strength <= 0 || toughness <= 0) {
    throw new RangeError('Strength and Toughness must be positive')
  }

  if (strength >= toughness * 2) return 2
  if (strength > toughness) return 3
  if (strength === toughness) return 4
  if (strength * 2 <= toughness) return 6
  return 5
}

export const encodeWoundTally = ({ saveableWounds, devastatingWounds }: WoundTally): string =>
  `${saveableWounds}:${devastatingWounds}`

export const decodeWoundTally = (key: string): WoundTally => {
  const [saveableWounds, devastatingWounds] = key.split(':').map(Number)
  if (saveableWounds === undefined || devastatingWounds === undefined) {
    throw new TypeError('Invalid wound tally key')
  }
  return { saveableWounds, devastatingWounds }
}

export const woundTallyDistribution = (
  hitTallyKey: string,
  weapon: WeaponProfile,
  target: TargetProfile,
): PMF<string> => {
  const hitTally = decodeHitTally(hitTallyKey)
  const singleRoll = checkD6({
    target: woundTarget(weapon.strength, target.toughness),
    modifier: weapon.rules?.woundModifier,
    reroll: weapon.rules?.rerollWounds,
  })

  let result = pointMass(encodeWoundTally({
    saveableWounds: hitTally.automaticWounds,
    devastatingWounds: 0,
  }))

  for (let index = 0; index < hitTally.normalHits; index += 1) {
    result = flatMapDistribution(result, (currentKey) => {
      const current = decodeWoundTally(currentKey)
      return mapDistribution(singleRoll, (outcome) => {
        if (outcome === 'failure') return currentKey
        if (outcome === 'critical' && weapon.rules?.devastatingWounds === true) {
          return encodeWoundTally({
            saveableWounds: current.saveableWounds,
            devastatingWounds: current.devastatingWounds + 1,
          })
        }
        return encodeWoundTally({
          saveableWounds: current.saveableWounds + 1,
          devastatingWounds: current.devastatingWounds,
        })
      })
    })
  }
  return result
}
