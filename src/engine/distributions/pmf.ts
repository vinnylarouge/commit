export type Probability = number

export type PMF<T> = ReadonlyMap<T, Probability>

const EPSILON = 1e-12

const addProbability = <T>(target: Map<T, number>, value: T, probability: number) => {
  target.set(value, (target.get(value) ?? 0) + probability)
}

export const createPmf = <T>(entries: Iterable<readonly [T, number]>): PMF<T> => {
  const probabilities = new Map<T, number>()
  let total = 0

  for (const [value, probability] of entries) {
    if (!Number.isFinite(probability) || probability < 0) {
      throw new RangeError('Distribution probabilities must be finite and non-negative')
    }
    if (probability === 0) continue
    addProbability(probabilities, value, probability)
    total += probability
  }

  if (total <= EPSILON) {
    throw new RangeError('Distribution must contain positive probability mass')
  }

  for (const [value, probability] of probabilities) {
    probabilities.set(value, probability / total)
  }

  return probabilities
}

export const pointMass = <T>(value: T): PMF<T> => new Map([[value, 1]])

export const mapDistribution = <T, U>(
  distribution: PMF<T>,
  transform: (value: T) => U,
): PMF<U> => {
  const mapped = new Map<U, number>()
  for (const [value, probability] of distribution) {
    addProbability(mapped, transform(value), probability)
  }
  return createPmf(mapped)
}

export const flatMapDistribution = <T, U>(
  distribution: PMF<T>,
  transform: (value: T) => PMF<U>,
): PMF<U> => {
  const mapped = new Map<U, number>()
  for (const [value, outerProbability] of distribution) {
    for (const [nextValue, innerProbability] of transform(value)) {
      addProbability(mapped, nextValue, outerProbability * innerProbability)
    }
  }
  return createPmf(mapped)
}

export const convolve = <T, U, V>(
  left: PMF<T>,
  right: PMF<U>,
  combine: (leftValue: T, rightValue: U) => V,
): PMF<V> => flatMapDistribution(left, (leftValue) =>
  mapDistribution(right, (rightValue) => combine(leftValue, rightValue)),
)

export const condition = <T>(
  distribution: PMF<T>,
  predicate: (value: T) => boolean,
): PMF<T> => createPmf(
  [...distribution].filter(([value]) => predicate(value)),
)

export const probabilityOf = <T>(
  distribution: PMF<T>,
  predicate: (value: T) => boolean,
): Probability => {
  let probability = 0
  for (const [value, mass] of distribution) {
    if (predicate(value)) probability += mass
  }
  return probability
}

export const expectation = <T>(
  distribution: PMF<T>,
  valueOf: (value: T) => number,
): number => {
  let result = 0
  for (const [value, probability] of distribution) {
    result += valueOf(value) * probability
  }
  return result
}

export const repeatDistribution = <T, U>(
  count: number,
  initial: T,
  outcome: PMF<U>,
  combine: (state: T, result: U) => T,
): PMF<T> => {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Repeat count must be a non-negative integer')
  }

  let result = pointMass(initial)
  for (let index = 0; index < count; index += 1) {
    result = convolve(result, outcome, combine)
  }
  return result
}
