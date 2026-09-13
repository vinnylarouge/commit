import type { UnitProfile } from './profiles'

export type SandboxModifiers = Readonly<{
  benefitOfCover: boolean
  hitModifier: number
  woundModifier: number
  rerollHits: 'none' | 'ones' | 'failed'
  rerollWounds: 'none' | 'ones' | 'failed'
  lethalHits: boolean
  sustainedHits: number
  devastatingWounds: boolean
  damageReduction: number
}>

export type SandboxState = Readonly<{
  version: 1
  attacker: UnitProfile
  target: UnitProfile
  modifiers: SandboxModifiers
}>

export const defaultSandboxModifiers: SandboxModifiers = {
  benefitOfCover: false,
  hitModifier: 0,
  woundModifier: 0,
  rerollHits: 'none',
  rerollWounds: 'none',
  lethalHits: false,
  sustainedHits: 0,
  devastatingWounds: false,
  damageReduction: 0,
}
