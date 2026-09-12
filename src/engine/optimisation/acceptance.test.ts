import { describe, expect, it } from 'vitest'
import { probabilityWord } from '../../domain/probability'
import { analyseCombat } from '../combat/analyseCombat'
import { unitId, weaponId, type CombatRequest } from '../combat/types'
import { createPmf, type PMF } from '../distributions/pmf'
import { optimiseCommitment } from './optimise'
import type { CommitmentAction, ResourceCost } from './types'

type ScenarioState = 'fresh' | 'dead' | 'after-a' | 'after-a-cp' | 'after-b' | 'still-alive'

const baseCost: ResourceCost = {
  activations: 1,
  commandPoints: 0,
  oncePerGameUses: [],
  expectedOverkill: 0,
}

const transition = (
  killProbability: number,
  survivorState: ScenarioState,
): PMF<ScenarioState> => createPmf([
  ['dead', killProbability],
  [survivorState, 1 - killProbability],
])

const action = (
  id: string,
  transitions: Partial<Record<ScenarioState, Readonly<[number, ScenarioState]>>>,
  cost: ResourceCost = baseCost,
  attackerId = id,
): CommitmentAction<ScenarioState> => ({
  id,
  attackerId,
  name: id,
  cost,
  legal: (state) => state !== 'dead' && transitions[state] !== undefined,
  transition: (state) => {
    const configured = transitions[state]
    if (configured === undefined) throw new Error(`${id} is not legal in ${state}`)
    return transition(configured[0], configured[1])
  },
})

const firstAction = <State extends string | number>(
  result: ReturnType<typeof optimiseCommitment<State>>,
): string | null => {
  const candidate = result.kind === 'satisfied' ? result.recommendation : result.bestEffort
  return candidate.plan.kind === 'act' ? candidate.plan.action.id : null
}

describe('SPEC section 40 acceptance scenarios', () => {
  it('A: returns one sufficient attacker and stops', () => {
    const result = optimiseCommitment({
      initialState: 'fresh' as ScenarioState,
      actions: [
        action('A', { fresh: [0.98, 'after-a'] }),
        action('B', { fresh: [0.5, 'after-b'], 'after-a': [1, 'still-alive'] }),
      ],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.8,
    })

    expect(result.kind).toBe('satisfied')
    if (result.kind !== 'satisfied') return
    expect(result.recommendation.successProbability).toBeCloseTo(0.98)
    expect(firstAction(result)).toBe('A')
    expect(result.recommendation.expectedCost.activations).toBeCloseTo(1)
    expect(result.recommendation.plan.kind).toBe('act')
    if (result.recommendation.plan.kind !== 'act') return
    expect(result.recommendation.plan.branches.every(({ next }) => next.kind === 'stop')).toBe(true)
  })

  it('B: returns A then B only on the survival branch', () => {
    const result = optimiseCommitment({
      initialState: 'fresh' as ScenarioState,
      actions: [
        action('A', {
          fresh: [0.7, 'after-a'],
          'after-b': [26 / 35, 'still-alive'],
        }),
        action('B', {
          fresh: [0.65, 'after-b'],
          'after-a': [0.8, 'still-alive'],
        }),
      ],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.9,
    })

    expect(result.kind).toBe('satisfied')
    if (result.kind !== 'satisfied') return
    expect(firstAction(result)).toBe('A')
    expect(result.recommendation.successProbability).toBeCloseTo(0.94)
    expect(result.recommendation.plan.kind).toBe('act')
    if (result.recommendation.plan.kind !== 'act') return
    const successBranch = result.recommendation.plan.branches.find(({ state }) => state === 'dead')
    const survivalBranch = result.recommendation.plan.branches.find(({ state }) => state === 'after-a')
    expect(successBranch?.next).toEqual({ kind: 'stop', outcome: 'success' })
    expect(survivalBranch?.next.kind).toBe('act')
    if (survivalBranch?.next.kind === 'act') {
      expect(survivalBranch.next.action.id).toBe('B')
    }
  })

  it('C: rejects a CP spend that only raises an already-sufficient policy', () => {
    const result = optimiseCommitment({
      initialState: 'fresh' as ScenarioState,
      actions: [
        action('A', { fresh: [0.7, 'after-a'] }, baseCost, 'A'),
        action('A + 1 CP', { fresh: [0.75, 'after-a-cp'] }, {
          ...baseCost,
          commandPoints: 1,
        }, 'A'),
        action('B', {
          fresh: [0.6, 'after-b'],
          'after-a': [0.7, 'still-alive'],
          'after-a-cp': [0.72, 'still-alive'],
        }),
      ],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.9,
      commandPointsAvailable: 1,
    })

    expect(result.kind).toBe('satisfied')
    if (result.kind !== 'satisfied') return
    expect(firstAction(result)).toBe('A')
    expect(result.recommendation.successProbability).toBeCloseTo(0.91)
    expect(result.recommendation.expectedCost.commandPoints).toBe(0)
    expect(result.paretoFrontier.some(({ successProbability }) => Math.abs(successProbability - 0.93) < 1e-9)).toBe(true)
  })

  it('D: reports an impossible confidence threshold explicitly', () => {
    const result = optimiseCommitment({
      initialState: 'fresh' as ScenarioState,
      actions: [action('ALL RESOURCES', { fresh: [0.72, 'still-alive'] })],
      goal: (state) => state === 'dead',
      requiredConfidence: 0.95,
    })

    expect(result.kind).toBe('impossible')
    if (result.kind !== 'impossible') return
    expect(result.maxAchievableProbability).toBeCloseTo(0.72)
    expect(firstAction(result)).toBe('ALL RESOURCES')
  })

  it('F: derives the trace and probability word from the analysed parameters', () => {
    const request: CombatRequest = {
      weapon: {
        id: weaponId('trace-weapon'),
        name: 'Trace weapon',
        attacks: { kind: 'constant', value: 1 },
        skill: 3,
        strength: 6,
        armourPenetration: -1,
        damage: { kind: 'constant', value: 2 },
      },
      target: {
        id: unitId('trace-target'),
        name: 'Trace target',
        models: 1,
        toughness: 5,
        armourSave: 4,
        invulnerableSave: null,
        woundsPerModel: 2,
        feelNoPain: null,
        benefitOfCover: false,
      },
    }
    const analysis = analyseCombat(request)
    const displayedProbability = analysis.killProbability * 100

    expect(analysis.rulesTrace).toContain('Hit on 3+')
    expect(analysis.rulesTrace).toContain('Strength 6 into Toughness 5: wound on 3+')
    expect(analysis.rulesTrace).toContain('AP -1: effective save 5+')
    expect(probabilityWord(displayedProbability)).toBe('unlikely')
  })
})
