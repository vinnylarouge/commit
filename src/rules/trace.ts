import type { CombatRequest } from '../engine/combat/types'
import { effectiveSaveTarget } from './core/save'
import { woundTarget } from './core/wound'

const diceText = (expression: CombatRequest['weapon']['attacks']): string =>
  expression.kind === 'constant'
    ? String(expression.value)
    : `${expression.count}d${expression.sides}${expression.modifier === 0 ? '' : expression.modifier > 0 ? `+${expression.modifier}` : expression.modifier}`

export const buildRulesTrace = ({ weapon, target, damageReduction = 0 }: CombatRequest): ReadonlyArray<string> => {
  const rules = weapon.rules
  return [
    `${weapon.name}: ${diceText(weapon.attacks)} attacks`,
    `Hit on ${weapon.skill}+${rules?.hitModifier === undefined ? '' : ` with ${rules.hitModifier >= 0 ? '+' : ''}${rules.hitModifier} modifier`}`,
    rules?.rerollHits === undefined || rules.rerollHits === 'none' ? null : `Hit re-rolls: ${rules.rerollHits}`,
    rules?.lethalHits ? 'Lethal Hits applied on critical hits' : null,
    rules?.sustainedHits === undefined || rules.sustainedHits === 0 ? null : `Sustained Hits ${rules.sustainedHits} applied on critical hits`,
    `Strength ${weapon.strength} into Toughness ${target.toughness}: wound on ${woundTarget(weapon.strength, target.toughness)}+${rules?.woundModifier === undefined ? '' : ` with ${rules.woundModifier >= 0 ? '+' : ''}${rules.woundModifier} modifier`}`,
    rules?.rerollWounds === undefined || rules.rerollWounds === 'none' ? null : `Wound re-rolls: ${rules.rerollWounds}`,
    rules?.devastatingWounds ? 'Devastating Wounds bypass saves on critical wounds' : null,
    `AP ${weapon.armourPenetration}: effective save ${effectiveSaveTarget(target, weapon.armourPenetration)}+`,
    target.benefitOfCover ? 'Benefit of Cover applied to the target save' : null,
    `Damage ${diceText(weapon.damage)}`,
    damageReduction === 0 ? null : `Damage reduction ${damageReduction} applied per failed save, to a minimum of 1`,
    `Target: ${target.models} models, ${target.woundsPerModel} wounds each${target.feelNoPain === null ? '' : `, Feel No Pain ${target.feelNoPain}+`}`,
  ].filter((line): line is string => line !== null)
}
