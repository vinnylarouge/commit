import type { PMF } from '../distributions/pmf'

export type ResourceCost = Readonly<{
  activations: number
  commandPoints: number
  oncePerGameUses: ReadonlyArray<string>
  expectedOverkill: number
}>

export type ExpectedCost = Readonly<{
  activations: number
  commandPoints: number
  scarceResourceUses: number
  expectedOverkill: number
}>

export type CommitmentAction<State extends string | number> = Readonly<{
  id: string
  attackerId: string
  name: string
  cost: ResourceCost
  transition: (state: State) => PMF<State>
  legal?: (state: State) => boolean
  observation?: (state: State) => string
}>

export type PlanAction = Readonly<{
  id: string
  attackerId: string
  name: string
  cost: ResourceCost
}>

export type PlanNode<State extends string | number> =
  | Readonly<{
      kind: 'stop'
      outcome: 'success' | 'failure'
    }>
  | Readonly<{
      kind: 'act'
      action: PlanAction
      branches: ReadonlyArray<Readonly<{
        observation: string
        state: State
        probability: number
        next: PlanNode<State>
      }>>
    }>

export type PolicyCandidate<State extends string | number> = Readonly<{
  plan: PlanNode<State>
  successProbability: number
  expectedCost: ExpectedCost
}>

export type OptimisationWeights = Readonly<{
  activations: number
  commandPoints: number
  scarceResourceUses: number
  expectedOverkill: number
}>

export type OptimisationRequest<State extends string | number> = Readonly<{
  initialState: State
  actions: ReadonlyArray<CommitmentAction<State>>
  goal: (state: State) => boolean
  requiredConfidence: number
  commandPointsAvailable?: number
  maxDepth?: number
  weights?: Partial<OptimisationWeights>
}>

export type OptimisationResult<State extends string | number> =
  | Readonly<{
      kind: 'satisfied'
      requiredConfidence: number
      recommendation: PolicyCandidate<State>
      paretoFrontier: ReadonlyArray<PolicyCandidate<State>>
    }>
  | Readonly<{
      kind: 'impossible'
      requiredConfidence: number
      maxAchievableProbability: number
      bestEffort: PolicyCandidate<State>
      paretoFrontier: ReadonlyArray<PolicyCandidate<State>>
    }>
