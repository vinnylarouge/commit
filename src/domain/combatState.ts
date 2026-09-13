import type { RerollRule } from '../engine/dice/d6Check'
import type { RosterId, SessionId, UnitId, WeaponId } from './ids'

export type CombatMode = 'shoot' | 'fight' | 'both'
export type ProfileOverride = 'profile' | 'none' | 2 | 3 | 4 | 5 | 6

export type AttackerModifiers = Readonly<{
  hitModifier: number
  woundModifier: number
  rerollHits: RerollRule | 'profile'
  rerollWounds: RerollRule | 'profile'
  lethalHits: boolean
  sustainedHits: number
  devastatingWounds: boolean
}>

export type AttackerSetup = Readonly<{
  unitId: UnitId
  modelCount: number
  shootWeaponId: WeaponId | null
  fightWeaponId: WeaponId | null
  modifiers: AttackerModifiers
}>

export type DefenderSetup = Readonly<{
  modelCount: number
  toughnessModifier: number
  saveModifier: number
  rerollSaves: RerollRule
  benefitOfCover: boolean
  invulnerableSave: ProfileOverride
  feelNoPain: ProfileOverride
}>

export type GameSession = Readonly<{
  id: SessionId
  myRosterId: RosterId
  opponentRosterId: RosterId
  mode: CombatMode
  selectedTargetId: UnitId
  selectedAttackerIds: ReadonlyArray<UnitId>
  attackerSetups: Readonly<Record<string, AttackerSetup>>
  defenderSetup: DefenderSetup
  updatedAt: string
}>
