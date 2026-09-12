import type {
  CommitmentAction,
  ExpectedCost,
  OptimisationRequest,
  OptimisationResult,
  OptimisationWeights,
  PlanNode,
  PolicyCandidate,
  ResourceCost,
} from './types'

const EPSILON = 1e-12
const zeroCost: ExpectedCost = {
  activations: 0,
  commandPoints: 0,
  scarceResourceUses: 0,
  expectedOverkill: 0,
}

const defaultWeights: OptimisationWeights = {
  activations: 1,
  commandPoints: 1,
  scarceResourceUses: 1,
  expectedOverkill: 0.01,
}

const immediateCost = (cost: ResourceCost): ExpectedCost => ({
  activations: cost.activations,
  commandPoints: cost.commandPoints,
  scarceResourceUses: cost.oncePerGameUses.length,
  expectedOverkill: cost.expectedOverkill,
})

const addWeightedCost = (
  left: ExpectedCost,
  right: ExpectedCost,
  probability: number,
): ExpectedCost => ({
  activations: left.activations + probability * right.activations,
  commandPoints: left.commandPoints + probability * right.commandPoints,
  scarceResourceUses: left.scarceResourceUses + probability * right.scarceResourceUses,
  expectedOverkill: left.expectedOverkill + probability * right.expectedOverkill,
})

const costsNoGreater = (left: ExpectedCost, right: ExpectedCost): boolean =>
  left.activations <= right.activations + EPSILON
  && left.commandPoints <= right.commandPoints + EPSILON
  && left.scarceResourceUses <= right.scarceResourceUses + EPSILON
  && left.expectedOverkill <= right.expectedOverkill + EPSILON

const costsStrictlyLower = (left: ExpectedCost, right: ExpectedCost): boolean =>
  left.activations < right.activations - EPSILON
  || left.commandPoints < right.commandPoints - EPSILON
  || left.scarceResourceUses < right.scarceResourceUses - EPSILON
  || left.expectedOverkill < right.expectedOverkill - EPSILON

const dominates = <State extends string | number>(
  left: PolicyCandidate<State>,
  right: PolicyCandidate<State>,
): boolean => {
  const probabilityNoLower = left.successProbability >= right.successProbability - EPSILON
  const strictlyMoreSuccessful = left.successProbability > right.successProbability + EPSILON
  return probabilityNoLower
    && costsNoGreater(left.expectedCost, right.expectedCost)
    && (strictlyMoreSuccessful || costsStrictlyLower(left.expectedCost, right.expectedCost))
}

export const paretoPrune = <State extends string | number>(
  candidates: ReadonlyArray<PolicyCandidate<State>>,
): ReadonlyArray<PolicyCandidate<State>> => candidates.filter((candidate, index) =>
  !candidates.some((other, otherIndex) => otherIndex !== index && dominates(other, candidate)),
)

const score = (cost: ExpectedCost, weights: OptimisationWeights): number =>
  cost.activations * weights.activations
  + cost.commandPoints * weights.commandPoints
  + cost.scarceResourceUses * weights.scarceResourceUses
  + cost.expectedOverkill * weights.expectedOverkill

const validateAction = <State extends string | number>(action: CommitmentAction<State>) => {
  const { cost } = action
  if (
    cost.activations < 0
    || cost.commandPoints < 0
    || cost.expectedOverkill < 0
    || !Number.isFinite(cost.activations)
    || !Number.isFinite(cost.commandPoints)
    || !Number.isFinite(cost.expectedOverkill)
  ) {
    throw new RangeError(`Action ${action.id} has an invalid resource cost`)
  }
}

type PartialBranch<State extends string | number> = Readonly<{
  successProbability: number
  expectedCost: ExpectedCost
  branches: ReadonlyArray<Readonly<{
    observation: string
    state: State
    probability: number
    next: PlanNode<State>
  }>>
}>

const partialDominates = <State extends string | number>(
  left: PartialBranch<State>,
  right: PartialBranch<State>,
): boolean => dominates(
  { plan: { kind: 'stop', outcome: 'failure' }, ...left },
  { plan: { kind: 'stop', outcome: 'failure' }, ...right },
)

const prunePartials = <State extends string | number>(
  candidates: ReadonlyArray<PartialBranch<State>>,
): ReadonlyArray<PartialBranch<State>> => candidates.filter((candidate, index) =>
  !candidates.some((other, otherIndex) => otherIndex !== index && partialDominates(other, candidate)),
)

const removeConsumedActions = <State extends string | number>(
  actions: ReadonlyArray<CommitmentAction<State>>,
  selected: CommitmentAction<State>,
): ReadonlyArray<CommitmentAction<State>> => {
  const consumedResources = new Set(selected.cost.oncePerGameUses)
  return actions.filter((candidate) =>
    candidate.attackerId !== selected.attackerId
    && !candidate.cost.oncePerGameUses.some((resource) => consumedResources.has(resource)),
  )
}

export const optimiseCommitment = <State extends string | number>(
  request: OptimisationRequest<State>,
): OptimisationResult<State> => {
  const {
    initialState,
    actions,
    goal,
    requiredConfidence,
    commandPointsAvailable = Number.POSITIVE_INFINITY,
    maxDepth = 3,
  } = request

  if (!Number.isFinite(requiredConfidence) || requiredConfidence < 0 || requiredConfidence > 1) {
    throw new RangeError('Required confidence must be between 0 and 1')
  }
  if (actions.length > 6) throw new RangeError('The optimiser accepts at most six candidate attackers')
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 3) {
    throw new RangeError('Maximum policy depth must be an integer from one to three')
  }
  if (
    commandPointsAvailable < 0
    || (!Number.isInteger(commandPointsAvailable) && commandPointsAvailable !== Number.POSITIVE_INFINITY)
  ) {
    throw new RangeError('Available command points must be a non-negative integer')
  }
  if (new Set(actions.map(({ id }) => id)).size !== actions.length) {
    throw new RangeError('Action identifiers must be unique')
  }
  actions.forEach(validateAction)

  const weights: OptimisationWeights = { ...defaultWeights, ...request.weights }
  if (Object.values(weights).some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError('Optimisation weights must be finite and non-negative')
  }
  const memo = new Map<string, ReadonlyArray<PolicyCandidate<State>>>()

  const search = (
    state: State,
    available: ReadonlyArray<CommitmentAction<State>>,
    depth: number,
    commandPointsRemaining: number,
  ): ReadonlyArray<PolicyCandidate<State>> => {
    if (goal(state)) {
      return [{
        plan: { kind: 'stop', outcome: 'success' },
        successProbability: 1,
        expectedCost: zeroCost,
      }]
    }

    const memoKey = `${typeof state}:${String(state)}|${available.map(({ id }) => id).sort().join(',')}|${depth}|${commandPointsRemaining}`
    const memoised = memo.get(memoKey)
    if (memoised !== undefined) return memoised

    const candidates: Array<PolicyCandidate<State>> = [{
      plan: { kind: 'stop', outcome: 'failure' },
      successProbability: 0,
      expectedCost: zeroCost,
    }]

    if (depth > 0) {
      for (const action of available) {
        if (action.cost.commandPoints > commandPointsRemaining) continue
        if (action.legal !== undefined && !action.legal(state)) continue

        const outcomes = action.transition(state)
        const nextActions = removeConsumedActions(available, action)
        let partials: ReadonlyArray<PartialBranch<State>> = [{
          successProbability: 0,
          expectedCost: immediateCost(action.cost),
          branches: [],
        }]

        for (const [nextState, probability] of outcomes) {
          const childCandidates = search(
            nextState,
            nextActions,
            depth - 1,
            commandPointsRemaining - action.cost.commandPoints,
          )
          const expanded: Array<PartialBranch<State>> = []
          for (const partial of partials) {
            for (const child of childCandidates) {
              expanded.push({
                successProbability: partial.successProbability + probability * child.successProbability,
                expectedCost: addWeightedCost(partial.expectedCost, child.expectedCost, probability),
                branches: [...partial.branches, {
                  observation: action.observation?.(nextState) ?? String(nextState),
                  state: nextState,
                  probability,
                  next: child.plan,
                }],
              })
            }
          }
          partials = prunePartials(expanded)
        }

        for (const partial of partials) {
          candidates.push({
            plan: {
              kind: 'act',
              action: {
                id: action.id,
                attackerId: action.attackerId,
                name: action.name,
                cost: action.cost,
              },
              branches: partial.branches,
            },
            successProbability: partial.successProbability,
            expectedCost: partial.expectedCost,
          })
        }
      }
    }

    const frontier = paretoPrune(candidates)
    memo.set(memoKey, frontier)
    return frontier
  }

  const frontier = search(initialState, actions, maxDepth, commandPointsAvailable)
  const eligible = frontier.filter(
    ({ successProbability }) => successProbability + EPSILON >= requiredConfidence,
  )

  if (eligible.length > 0) {
    const recommendation = [...eligible].sort((left, right) =>
      score(left.expectedCost, weights) - score(right.expectedCost, weights)
      || right.successProbability - left.successProbability,
    )[0]
    if (recommendation === undefined) throw new Error('Eligible policy selection failed')
    return {
      kind: 'satisfied',
      requiredConfidence,
      recommendation,
      paretoFrontier: frontier,
    }
  }

  const bestEffort = [...frontier].sort((left, right) =>
    right.successProbability - left.successProbability
    || score(left.expectedCost, weights) - score(right.expectedCost, weights),
  )[0] ?? {
    plan: { kind: 'stop', outcome: 'failure' } as const,
    successProbability: 0,
    expectedCost: zeroCost,
  }

  return {
    kind: 'impossible',
    requiredConfidence,
    maxAchievableProbability: bestEffort.successProbability,
    bestEffort,
    paretoFrontier: frontier,
  }
}
