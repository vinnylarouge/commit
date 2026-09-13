import type { UnitProfile, TargetProfile } from '../domain/profiles'
import type { UnitId } from '../domain/ids'
import type { AttackerSetup, CombatMode } from '../domain/combatState'
import type { OptimisationResult, PolicyCandidate } from '../engine/optimisation/types'

export type OptimiseAnalysisRequest = Readonly<{
  id: string
  kind: 'optimise-commitment'
  target: TargetProfile
  targetWoundsRemaining: number
  attackers: ReadonlyArray<UnitProfile>
  selectedAttackerIds: ReadonlyArray<UnitId>
  attackerSetups: Readonly<Record<string, AttackerSetup>>
  mode: CombatMode
  requiredConfidence: number
  targetUnsupportedRules: ReadonlyArray<string>
}>

export type AnalysisRequest = OptimiseAnalysisRequest

export type AttackSummary = Readonly<{
  actionId: string
  attackerId: UnitId
  attackerName: string
  weaponName: string
  killProbability: number
  expectedDamage: number
  typicalDamageLow: number
  typicalDamageHigh: number
  rulesTrace: ReadonlyArray<string>
  remainingWounds: ReadonlyArray<readonly [number, number]>
}>

export type CommitmentAnalysis = Readonly<{
  optimisation: OptimisationResult<number>
  attacks: ReadonlyArray<AttackSummary>
  alternatives: ReadonlyArray<PolicyCandidate<number>>
  unsupportedRules: ReadonlyArray<string>
  mode: CombatMode
}>

export type AnalysisResponse =
  | Readonly<{ id: string; kind: 'progress'; completed: number; total: number }>
  | Readonly<{ id: string; kind: 'success'; analysis: CommitmentAnalysis }>
  | Readonly<{ id: string; kind: 'failure'; message: string }>
