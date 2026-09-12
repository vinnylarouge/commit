import { describe, expect, it } from 'vitest'
import { checkD6 } from './d6Check'

describe('d6 checks', () => {
  it('resolves an unmodified 3+ check including its critical face', () => {
    const result = checkD6({ target: 3 })
    expect(result.get('failure')).toBeCloseTo(2 / 6)
    expect(result.get('success')).toBeCloseTo(3 / 6)
    expect(result.get('critical')).toBeCloseTo(1 / 6)
  })

  it('rerolls ones once', () => {
    const result = checkD6({ target: 3, reroll: 'ones' })
    expect((result.get('success') ?? 0) + (result.get('critical') ?? 0)).toBeCloseTo(7 / 9)
  })

  it('rerolls all failures once', () => {
    const result = checkD6({ target: 3, reroll: 'failed' })
    expect((result.get('success') ?? 0) + (result.get('critical') ?? 0)).toBeCloseTo(8 / 9)
  })

  it('keeps natural one as failure and natural six as critical under modifiers', () => {
    const result = checkD6({ target: 6, modifier: -4 })
    expect(result.get('failure')).toBeCloseTo(5 / 6)
    expect(result.get('critical')).toBeCloseTo(1 / 6)
  })
})
