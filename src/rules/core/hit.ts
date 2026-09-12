import { checkD6, type D6CheckOutcome } from '../../engine/dice/d6Check'
import {
  flatMapDistribution,
  mapDistribution,
  pointMass,
  type PMF,
} from '../../engine/distributions/pmf'
import type { WeaponProfile } from '../../engine/combat/types'

export type HitTally = Readonly<{
  normalHits: number
  automaticWounds: number
}>

export const encodeHitTally = ({ normalHits, automaticWounds }: HitTally): string =>
  `${normalHits}:${automaticWounds}`

export const decodeHitTally = (key: string): HitTally => {
  const [normalHits, automaticWounds] = key.split(':').map(Number)
  if (normalHits === undefined || automaticWounds === undefined) {
    throw new TypeError('Invalid hit tally key')
  }
  return { normalHits, automaticWounds }
}

const tallyForHitRoll = (
  outcome: D6CheckOutcome,
  weapon: WeaponProfile,
): HitTally => {
  if (outcome === 'failure') return { normalHits: 0, automaticWounds: 0 }

  const sustainedHits = outcome === 'critical' ? (weapon.rules?.sustainedHits ?? 0) : 0
  if (outcome === 'critical' && weapon.rules?.lethalHits === true) {
    return { normalHits: sustainedHits, automaticWounds: 1 }
  }
  return { normalHits: 1 + sustainedHits, automaticWounds: 0 }
}

export const hitTallyDistribution = (
  attackCount: number,
  weapon: WeaponProfile,
): PMF<string> => {
  if (!Number.isInteger(attackCount) || attackCount < 0) {
    throw new RangeError('Attack count must be a non-negative integer')
  }

  const singleRoll = mapDistribution(
    checkD6({
      target: weapon.skill,
      modifier: weapon.rules?.hitModifier,
      reroll: weapon.rules?.rerollHits,
    }),
    (outcome) => encodeHitTally(tallyForHitRoll(outcome, weapon)),
  )

  let result = pointMass(encodeHitTally({ normalHits: 0, automaticWounds: 0 }))
  for (let index = 0; index < attackCount; index += 1) {
    result = flatMapDistribution(result, (currentKey) => {
      const current = decodeHitTally(currentKey)
      return mapDistribution(singleRoll, (nextKey) => {
        const next = decodeHitTally(nextKey)
        return encodeHitTally({
          normalHits: current.normalHits + next.normalHits,
          automaticWounds: current.automaticWounds + next.automaticWounds,
        })
      })
    })
  }
  return result
}
