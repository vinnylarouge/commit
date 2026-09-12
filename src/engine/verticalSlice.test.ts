import { describe, expect, it } from 'vitest'
import { getVerticalSliceRecommendation } from './verticalSlice'

describe('Milestone 0 vertical slice', () => {
  it('returns the section 41 recommendation at reliable confidence', () => {
    expect(getVerticalSliceRecommendation(80)).toEqual({
      first: 'Eradicators',
      firstKillChance: 74,
      continuation: 'Ballistus',
      totalKillChance: 93,
      resourceAdvice: 'Save the CP',
    })
  })
})
