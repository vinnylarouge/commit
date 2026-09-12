import type { PMF } from '../distributions/pmf'
import type { TargetProfile, WeaponProfile } from '../../domain/profiles'

export { unitId, weaponId } from '../../domain/ids'
export type { TargetProfile, WeaponProfile } from '../../domain/profiles'

export type CombatRequest = Readonly<{
  weapon: WeaponProfile
  target: TargetProfile
  targetWoundsRemaining?: number
}>

export type AnalysisMethod =
  | Readonly<{ kind: 'exact' }>
  | Readonly<{ kind: 'monte-carlo'; samples: number; seed: bigint }>

export type CombatStages = Readonly<{
  attacks: PMF<number>
  hitTallies: PMF<string>
  woundTallies: PMF<string>
  damageInstances: PMF<number>
}>

export type CombatAnalysis = Readonly<{
  method: AnalysisMethod
  remainingWounds: PMF<number>
  killProbability: number
  expectedDamage: number
  stages: CombatStages
  rulesTrace: ReadonlyArray<string>
}>
