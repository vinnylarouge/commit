import { describe, expect, it } from 'vitest'
import { createPmf } from '../distributions/pmf'
import { optimiseCommitment } from './optimise'
import type { CommitmentAction, ResourceCost } from './types'

type State = 'alive' | 'dead'

const cost = (commandPoints = 0, oncePerGameUses: ReadonlyArray<string> = []): ResourceCost => ({
  activations: 1,
  commandPoints,
  oncePerGameUses,
  expectedOverkill: 0,
})

const chance = (
  id: string,
  probability: number,
  resourceCost = cost(),
  attackerId = id,
): CommitmentAction<State> => ({
  id,
  attackerId,
  name: id,
  cost: resourceCost,
  transition: () => createPmf<State>([
    ['dead', probability],
    ['alive', 1 - probability],
  ]),
})

describe('bounded commitment optimiser', () => {
  it('respects the command point budget', () => {
    const result = optimiseCommitment({
      initialState: 'alive' as State,
      actions: [chance('free', 0.7), chance('stratagem', 0.99, cost(1))],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.8,
      commandPointsAvailable: 0,
    })
    expect(result.kind).toBe('impossible')
    if (result.kind === 'impossible') expect(result.maxAchievableProbability).toBeCloseTo(0.7)
  })

  it('does not consume one once-per-game resource twice', () => {
    const result = optimiseCommitment({
      initialState: 'alive' as State,
      actions: [
        chance('first', 0.5, cost(0, ['oath'])),
        chance('second', 0.5, cost(0, ['oath'])),
      ],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.7,
    })
    expect(result.kind).toBe('impossible')
    if (result.kind === 'impossible') expect(result.maxAchievableProbability).toBeCloseTo(0.5)
  })

  it('retains materially different trade-offs on the Pareto frontier', () => {
    const result = optimiseCommitment({
      initialState: 'alive' as State,
      actions: [chance('steady', 0.8), chance('costly', 0.9, cost(1))],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.75,
      maxDepth: 1,
    })
    const actionIds = result.paretoFrontier.flatMap(({ plan }) =>
      plan.kind === 'act' ? [plan.action.id] : [],
    )
    expect(actionIds).toEqual(expect.arrayContaining(['steady', 'costly']))
  })

  it('commits nothing when the goal already holds', () => {
    const result = optimiseCommitment({
      initialState: 'dead' as State,
      actions: [chance('unused', 1)],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.95,
    })
    expect(result.kind).toBe('satisfied')
    if (result.kind === 'satisfied') {
      expect(result.recommendation.plan).toEqual({ kind: 'stop', outcome: 'success' })
      expect(result.recommendation.expectedCost.activations).toBe(0)
    }
  })

  it('rejects requests beyond the deliberate search bounds', () => {
    const actions = Array.from({ length: 7 }, (_, index) => chance(String(index), 0.5))
    expect(() => optimiseCommitment({
      initialState: 'alive' as State,
      actions,
      goal: (state) => state === 'dead',
      requiredConfidence: 0.8,
    })).toThrow(RangeError)
  })
})
