import { probabilityWord } from './probability'
import type { PlanNode, PolicyCandidate } from '../engine/optimisation/types'
import type { AttackSummary, CommitmentAnalysis } from '../workers/protocol'

export type RecommendationView = Readonly<{
  kind: 'satisfied' | 'impossible'
  firstActionId: string | null
  headline: string
  headlineProbability: number
  headlineWord: string
  continuation: string | null
  totalProbability: number
  totalWord: string
  resourceAdvice: string
  reason: string
  requiredConfidence: number
  expectedActivations: number
  expectedCommandPoints: number
  expectedOverkill: number
  analysisMethod: string
  rulesTrace: ReadonlyArray<string>
  alternatives: ReadonlyArray<Readonly<{ name: string; probability: number }>>
  unsupportedRules: ReadonlyArray<string>
}>

const percentage = (probability: number): number => Math.round(probability * 1000) / 10

const firstContinuation = (plan: PlanNode<number>): string | null => {
  if (plan.kind === 'stop') return null
  const continuation = plan.branches.find(({ state, next }) => state > 0 && next.kind === 'act')
  return continuation?.next.kind === 'act' ? continuation.next.action.name : null
}

const planName = (plan: PlanNode<number>): string => {
  if (plan.kind === 'stop') return 'Stop'
  const continuation = firstContinuation(plan)
  return continuation === null ? plan.action.name : `${plan.action.name} → ${continuation}`
}

const attackFor = (
  candidate: PolicyCandidate<number>,
  attacks: ReadonlyArray<AttackSummary>,
): AttackSummary | undefined => {
  const plan = candidate.plan
  return plan.kind === 'act'
    ? attacks.find(({ actionId }) => actionId === plan.action.id)
    : undefined
}

export const presentCommitment = (analysis: CommitmentAnalysis): RecommendationView => {
  const result = analysis.optimisation
  const candidate = result.kind === 'satisfied' ? result.recommendation : result.bestEffort
  const plan = candidate.plan
  const first = plan.kind === 'act' ? plan.action : null
  const attack = attackFor(candidate, analysis.attacks)
  const headlineProbability = result.kind === 'satisfied'
    ? percentage(attack?.killProbability ?? candidate.successProbability)
    : percentage(candidate.successProbability)
  const totalProbability = percentage(candidate.successProbability)
  const expectedCommandPoints = candidate.expectedCost.commandPoints

  return {
    kind: result.kind,
    firstActionId: first?.attackerId ?? null,
    headline: result.kind === 'impossible'
      ? 'No reliable plan'
      : first === null ? 'No attack needed' : `${first.name} first`,
    headlineProbability,
    headlineWord: probabilityWord(headlineProbability),
    continuation: firstContinuation(plan),
    totalProbability,
    totalWord: probabilityWord(totalProbability),
    resourceAdvice: expectedCommandPoints < 0.01
      ? 'Save the CP'
      : `Spend ${Math.ceil(expectedCommandPoints)} CP`,
    reason: result.kind === 'impossible'
      ? `Even the best available policy misses the ${percentage(result.requiredConfidence)}% requirement.`
      : firstContinuation(plan) === null
        ? 'This action reaches the requested confidence alone.'
        : 'Continue only if the target survives, preserving the later activation when it succeeds.',
    requiredConfidence: percentage(result.requiredConfidence),
    expectedActivations: candidate.expectedCost.activations,
    expectedCommandPoints,
    expectedOverkill: candidate.expectedCost.expectedOverkill,
    analysisMethod: 'Exact attack probabilities; adaptive plans grouped within 1 percentage point.',
    rulesTrace: attack?.rulesTrace ?? [],
    alternatives: analysis.alternatives
      .filter(({ plan: alternativePlan }) => alternativePlan.kind === 'act')
      .map((alternative) => ({
        name: planName(alternative.plan),
        probability: percentage(alternative.successProbability),
      }))
      .sort((left, right) => right.probability - left.probability)
      .slice(0, 5),
    unsupportedRules: analysis.unsupportedRules,
  }
}
