import {
  convolve,
  createPmf,
  mapDistribution,
  pointMass,
  type PMF,
} from '../distributions/pmf'

export type DiceExpr =
  | Readonly<{ kind: 'constant'; value: number }>
  | Readonly<{ kind: 'die'; count: number; sides: number; modifier: number }>

export const uniformDie = (sides: number): PMF<number> => {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new RangeError('A die must have at least two integer sides')
  }
  return createPmf(Array.from({ length: sides }, (_, index) => [index + 1, 1] as const))
}

export const rollDice = (count: number, sides = 6): PMF<number> => {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Dice count must be a non-negative integer')
  }

  const die = uniformDie(sides)
  let total = pointMass(0)
  for (let index = 0; index < count; index += 1) {
    total = convolve(total, die, (left, right) => left + right)
  }
  return total
}

export const evaluateDice = (expression: DiceExpr): PMF<number> => {
  if (expression.kind === 'constant') {
    if (!Number.isInteger(expression.value) || expression.value < 0) {
      throw new RangeError('A constant dice expression must be a non-negative integer')
    }
    return pointMass(expression.value)
  }

  return mapDistribution(
    rollDice(expression.count, expression.sides),
    (roll) => Math.max(0, roll + expression.modifier),
  )
}
