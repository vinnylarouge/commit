import { createPmf, type PMF } from '../distributions/pmf'

export type RerollRule = 'none' | 'ones' | 'failed'
export type D6CheckOutcome = 'failure' | 'success' | 'critical'

export type D6Check = Readonly<{
  target: number
  modifier?: number
  reroll?: RerollRule
}>

const outcomeFor = (face: number, target: number, modifier: number): D6CheckOutcome => {
  if (face === 1) return 'failure'
  if (face === 6) return 'critical'
  return face + modifier >= target ? 'success' : 'failure'
}

export const checkD6 = ({
  target,
  modifier = 0,
  reroll = 'none',
}: D6Check): PMF<D6CheckOutcome> => {
  if (!Number.isInteger(target) || target < 2 || target > 6) {
    throw new RangeError('A d6 check target must be an integer from 2 to 6')
  }

  const outcomes: Array<readonly [D6CheckOutcome, number]> = []
  for (let first = 1; first <= 6; first += 1) {
    const firstOutcome = outcomeFor(first, target, modifier)
    const shouldReroll = reroll === 'failed'
      ? firstOutcome === 'failure'
      : reroll === 'ones' && first === 1

    if (!shouldReroll) {
      outcomes.push([firstOutcome, 1 / 6])
      continue
    }

    for (let second = 1; second <= 6; second += 1) {
      outcomes.push([outcomeFor(second, target, modifier), 1 / 36])
    }
  }
  return createPmf(outcomes)
}
