import { probabilityWord } from './probability'
import type { PlanNode, PolicyCandidate } from '../engine/optimisation/types'
import type { AttackSummary, CommitmentAnalysis } from '../workers/protocol'

export type RecommendationView = Readonly<{
  kind: 'satisfied' | 'impossible'
  firstActionId: string | null
  headline: string
  headlineProbability: number
  headlineWord: string
  probabilityLabel: string
  continuation: string | null
  totalProbability: number
  totalWord: string
  commitmentAdvice: string
  reason: string
  requiredConfidence: number
  expectedActivations: number
  expectedOverkill: number
  averageDamage: number
  typicalDamageLow: number
  typicalDamageHigh: number
  weaponName: string | null
  modeLabel: string
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
  const headlineProbability = percentage(attack?.killProbability ?? candidate.successProbability)
  const totalProbability = percentage(candidate.successProbability)
  const modeLabel = analysis.mode === 'both' ? 'Shoot + Fight' : analysis.mode === 'shoot' ? 'Shoot' : 'Fight'

  return {
    kind: result.kind,
    firstActionId: first?.attackerId ?? null,
    headline: first === null
      ? result.kind === 'impossible' ? 'No available attack' : 'No attack needed'
      : `${first.name} first`,
    headlineProbability,
    headlineWord: probabilityWord(headlineProbability),
    probabilityLabel: 'kill chance',
    continuation: firstContinuation(plan),
    totalProbability,
    totalWord: probabilityWord(totalProbability),
    commitmentAdvice: result.kind === 'impossible'
      ? 'Below your confidence target'
      : firstContinuation(plan) === null ? 'Commit this unit' : 'Hold the second unit back',
    reason: result.kind === 'impossible'
      ? `Even the best available policy misses the ${percentage(result.requiredConfidence)}% requirement.`
      : firstContinuation(plan) === null
        ? 'This is the least commitment that reaches the requested confidence.'
        : `Add ${firstContinuation(plan)} only if the target survives.`,
    requiredConfidence: percentage(result.requiredConfidence),
    expectedActivations: candidate.expectedCost.activations,
    expectedOverkill: candidate.expectedCost.expectedOverkill,
    averageDamage: attack?.expectedDamage ?? 0,
    typicalDamageLow: attack?.typicalDamageLow ?? 0,
    typicalDamageHigh: attack?.typicalDamageHigh ?? 0,
    weaponName: attack?.weaponName ?? null,
    modeLabel,
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
