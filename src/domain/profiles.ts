import type { DiceExpr } from '../engine/dice/dice'
import type { RerollRule } from '../engine/dice/d6Check'
import type { AbilityId, UnitId, WeaponId } from './ids'

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
  keywords: ReadonlyArray<string>
  rules?: AttackRules
}>

export type UnitProfile = Readonly<{
  id: UnitId
  name: string
  points: number
  models: number
  toughness: number
  armourSave: number
  invulnerableSave: number | null
  woundsPerModel: number
  feelNoPain: number | null
  keywords: ReadonlyArray<string>
  weapons: ReadonlyArray<WeaponProfile>
  abilities: ReadonlyArray<AbilityId>
  unsupportedRules: ReadonlyArray<string>
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

export const targetProfile = (
  unit: UnitProfile,
  benefitOfCover = false,
): TargetProfile => ({
  id: unit.id,
  name: unit.name,
  models: unit.models,
  toughness: unit.toughness,
  armourSave: unit.armourSave,
  invulnerableSave: unit.invulnerableSave,
  woundsPerModel: unit.woundsPerModel,
  feelNoPain: unit.feelNoPain,
  benefitOfCover,
})
