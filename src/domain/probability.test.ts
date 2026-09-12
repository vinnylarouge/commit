import { describe, expect, it } from 'vitest'
import { probabilityWord } from './probability'

describe('probability house scale', () => {
  it.each([
    ['near certain', 97, 100],
    ['very likely', 90, 96.999],
    ['likely', 75, 89.999],
    ['probable', 55, 74.999],
    ['even odds', 45, 54.999],
    ['unlikely', 25, 44.999],
    ['very unlikely', 10, 24.999],
    ['remote', 0, 9.999],
  ] as const)('labels the %s band at both endpoints', (label, lower, upper) => {
    expect(probabilityWord(lower)).toBe(label)
    expect(probabilityWord(upper)).toBe(label)
  })

  it.each([-0.001, 100.001, Number.NaN])('rejects out-of-range value %s', (value) => {
    expect(() => probabilityWord(value)).toThrow(RangeError)
  })
})
