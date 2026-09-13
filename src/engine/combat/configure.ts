import type {
  AttackerModifiers,
  DefenderSetup,
  ProfileOverride,
} from '../../domain/combatState'
import type { DiceExpr } from '../dice/dice'
import type { UnitProfile } from '../../domain/profiles'
import type { TargetProfile, WeaponProfile } from './types'

const bounded = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, Math.floor(value)))

const overrideSave = (profileValue: number | null, override: ProfileOverride): number | null =>
  override === 'profile' ? profileValue : override === 'none' ? null : override

export const scaleDice = (dice: DiceExpr, count: number): DiceExpr => dice.kind === 'constant'
  ? { kind: 'constant', value: dice.value * count }
  : { kind: 'die', count: dice.count * count, sides: dice.sides, modifier: dice.modifier * count }

export const configureWeapon = (
  weapon: WeaponProfile,
  modelCount: number,
  modifiers: AttackerModifiers,
): WeaponProfile => {
  const hitModifier = (weapon.rules?.hitModifier ?? 0) + modifiers.hitModifier
  const woundModifier = (weapon.rules?.woundModifier ?? 0) + modifiers.woundModifier
  return {
    ...weapon,
    attacks: scaleDice(weapon.attacks, bounded(modelCount, 1, 100)),
    rules: {
      ...weapon.rules,
      ...(hitModifier === 0 ? {} : { hitModifier }),
      ...(woundModifier === 0 ? {} : { woundModifier }),
      rerollHits: modifiers.rerollHits === 'profile' ? (weapon.rules?.rerollHits ?? 'none') : modifiers.rerollHits,
      rerollWounds: modifiers.rerollWounds === 'profile' ? (weapon.rules?.rerollWounds ?? 'none') : modifiers.rerollWounds,
      lethalHits: weapon.rules?.lethalHits === true || modifiers.lethalHits,
      sustainedHits: Math.max(weapon.rules?.sustainedHits ?? 0, modifiers.sustainedHits),
      devastatingWounds: weapon.rules?.devastatingWounds === true || modifiers.devastatingWounds,
    },
  }
}

export const configureTarget = (
  unit: UnitProfile,
  setup: DefenderSetup,
): TargetProfile => ({
  id: unit.id,
  name: unit.name,
  models: bounded(setup.modelCount, 1, 100),
  toughness: bounded(unit.toughness + setup.toughnessModifier, 1, 100),
  armourSave: unit.armourSave,
  invulnerableSave: overrideSave(unit.invulnerableSave, setup.invulnerableSave),
  woundsPerModel: unit.woundsPerModel,
  feelNoPain: overrideSave(unit.feelNoPain, setup.feelNoPain),
  benefitOfCover: setup.benefitOfCover,
  saveModifier: bounded(setup.saveModifier, -2, 2),
  rerollSaves: setup.rerollSaves,
})
