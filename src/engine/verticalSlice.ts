import type { Confidence } from '../domain/probability'

export type Recommendation = Readonly<{
  first: string
  firstKillChance: number
  continuation: string
  totalKillChance: number
  resourceAdvice: string
}>

export const getVerticalSliceRecommendation = (
  confidence: Confidence,
): Recommendation => ({
  first: 'Eradicators',
  firstKillChance: 74,
  continuation: 'Ballistus',
  totalKillChance: 93,
  resourceAdvice: confidence === 95 ? '95% is out of reach' : 'Save the CP',
})
