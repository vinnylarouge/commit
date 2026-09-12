import type { DiceExpr } from '../dice/dice'
import type { RerollRule } from '../dice/d6Check'
import type { PMF } from '../distributions/pmf'

export type Brand<T, Name extends string> = T & Readonly<{ __brand: Name }>
export type UnitId = Brand<string, 'UnitId'>
export type WeaponId = Brand<string, 'WeaponId'>

export const unitId = (value: string): UnitId => value as UnitId
export const weaponId = (value: string): WeaponId => value as WeaponId

export type AttackRules = Readonly<{
  hitModifier?: number
  woundModifier?: number
  rerollHits?: RerollRule
  rerollWounds?: RerollRule
  lethalHits?: boolean
  sustainedHits?: number
  devastatingWounds?: boolean
}>

export type WeaponProfile = Readonly<{
  id: WeaponId
  name: string
  attacks: DiceExpr
  skill: number
  strength: number
  armourPenetration: number
  damage: DiceExpr
  rules?: AttackRules
}>

export type TargetProfile = Readonly<{
  id: UnitId
  name: string
  models: number
  toughness: number
  armourSave: number
  invulnerableSave: number | null
  woundsPerModel: number
  feelNoPain: number | null
  benefitOfCover: boolean
}>

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
