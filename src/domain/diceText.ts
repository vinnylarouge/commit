import type { DiceExpr } from '../engine/dice/dice'

export const formatDice = (expression: DiceExpr): string => expression.kind === 'constant'
  ? String(expression.value)
  : `${expression.count === 1 ? '' : expression.count}D${expression.sides}${expression.modifier === 0 ? '' : expression.modifier > 0 ? `+${expression.modifier}` : expression.modifier}`

export const parseDice = (source: string): DiceExpr | null => {
  const cleaned = source.trim().toUpperCase()
  if (/^\d+$/.test(cleaned)) return { kind: 'constant', value: Number(cleaned) }
  const match = cleaned.match(/^(\d*)D(\d+)([+-]\d+)?$/)
  if (match === null) return null
  return {
    kind: 'die',
    count: match[1] === '' ? 1 : Number(match[1]),
    sides: Number(match[2]),
    modifier: match[3] === undefined ? 0 : Number(match[3]),
  }
}
