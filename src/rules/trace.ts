import type { CombatRequest } from '../engine/combat/types'
import { effectiveSaveTarget } from './core/save'
import { woundTarget } from './core/wound'

const diceText = (expression: CombatRequest['weapon']['attacks']): string =>
  expression.kind === 'constant'
    ? String(expression.value)
    : `${expression.count}d${expression.sides}${expression.modifier === 0 ? '' : expression.modifier > 0 ? `+${expression.modifier}` : expression.modifier}`

export const buildRulesTrace = ({ weapon, target }: CombatRequest): ReadonlyArray<string> => [
  `${weapon.name}: ${diceText(weapon.attacks)} attacks`,
  `Hit on ${weapon.skill}+${weapon.rules?.hitModifier === undefined ? '' : ` with ${weapon.rules.hitModifier >= 0 ? '+' : ''}${weapon.rules.hitModifier} modifier`}`,
  `Strength ${weapon.strength} into Toughness ${target.toughness}: wound on ${woundTarget(weapon.strength, target.toughness)}+`,
  `AP ${weapon.armourPenetration}: effective save ${effectiveSaveTarget(target, weapon.armourPenetration)}+`,
  `Damage ${diceText(weapon.damage)}`,
  `Target: ${target.models} models, ${target.woundsPerModel} wounds each${target.feelNoPain === null ? '' : `, Feel No Pain ${target.feelNoPain}+`}`,
]
