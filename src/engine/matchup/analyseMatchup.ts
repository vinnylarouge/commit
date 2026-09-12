import type { UnitProfile } from '../../domain/profiles'
import { targetProfile } from '../../domain/profiles'
import { analyseCombat } from '../combat/analyseCombat'

export type MatchupCell = Readonly<{
  attackerId: string
  targetId: string
  expectedDamage: number
  killProbability: number
  expectedEnemyPointsRemoved: number
  damagePerHundredPoints: number
  enemyPointsPerHundredPoints: number
  killProbabilityPerHundredPoints: number
}>

export type MatchupAnalysis = Readonly<{
  cells: ReadonlyArray<MatchupCell>
  bestByTarget: ReadonlyArray<Readonly<{
    target: UnitProfile
    attacker: UnitProfile | null
    cell: MatchupCell | null
  }>>
}>

export const analyseMatchup = (
  attackers: ReadonlyArray<UnitProfile>,
  targets: ReadonlyArray<UnitProfile>,
): MatchupAnalysis => {
  const cells = attackers.flatMap((attacker) => {
    const weapon = attacker.weapons[0]
    if (weapon === undefined) return []
    return targets.map((target): MatchupCell => {
      const result = analyseCombat({ weapon, target: targetProfile(target) })
      const targetWounds = target.models * target.woundsPerModel
      const expectedEnemyPointsRemoved = target.points * result.expectedDamage / targetWounds
      const pointScale = attacker.points > 0 ? 100 / attacker.points : 0
      return {
        attackerId: attacker.id,
        targetId: target.id,
        expectedDamage: result.expectedDamage,
        killProbability: result.killProbability,
        expectedEnemyPointsRemoved,
        damagePerHundredPoints: result.expectedDamage * pointScale,
        enemyPointsPerHundredPoints: expectedEnemyPointsRemoved * pointScale,
        killProbabilityPerHundredPoints: result.killProbability * pointScale,
      }
    })
  })
  return {
    cells,
    bestByTarget: targets.map((target) => {
      const best = cells
        .filter(({ targetId }) => targetId === target.id)
        .sort((left, right) => right.enemyPointsPerHundredPoints - left.enemyPointsPerHundredPoints)[0] ?? null
      return {
        target,
        attacker: best === null ? null : attackers.find(({ id }) => id === best.attackerId) ?? null,
        cell: best,
      }
    }),
  }
}
