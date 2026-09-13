import type { UnitProfile } from './profiles'
import type { WeaponId } from './ids'
import type { ProfileOverride } from './combatState'

export type SandboxModifiers = Readonly<{
  benefitOfCover: boolean
  hitModifier: number
  woundModifier: number
  rerollHits: 'profile' | 'none' | 'ones' | 'failed'
  rerollWounds: 'profile' | 'none' | 'ones' | 'failed'
  lethalHits: boolean
  sustainedHits: number
  devastatingWounds: boolean
  damageReduction: number
  toughnessModifier: number
  saveModifier: number
  rerollSaves: 'none' | 'ones' | 'failed'
  invulnerableSave: ProfileOverride
  feelNoPain: ProfileOverride
}>

export type SandboxState = Readonly<{
  version: 1
  attacker: UnitProfile
  target: UnitProfile
  weaponId?: WeaponId | undefined
  modifiers: SandboxModifiers
}>

export const defaultSandboxModifiers: SandboxModifiers = {
  benefitOfCover: false,
  hitModifier: 0,
  woundModifier: 0,
  rerollHits: 'profile',
  rerollWounds: 'profile',
  lethalHits: false,
  sustainedHits: 0,
  devastatingWounds: false,
  damageReduction: 0,
  toughnessModifier: 0,
  saveModifier: 0,
  rerollSaves: 'none',
  invulnerableSave: 'profile',
  feelNoPain: 'profile',
}
