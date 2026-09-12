export type Confidence = 60 | 80 | 95

export type ConfidencePreset = Readonly<{
  label: string
  value: Confidence
}>

export const confidencePresets: ReadonlyArray<ConfidencePreset> = [
  { label: 'Gamble', value: 60 },
  { label: 'Reliable', value: 80 },
  { label: 'Must happen', value: 95 },
]

const probabilityBands = [
  { minimum: 97, label: 'near certain' },
  { minimum: 90, label: 'very likely' },
  { minimum: 75, label: 'likely' },
  { minimum: 55, label: 'probable' },
  { minimum: 45, label: 'even odds' },
  { minimum: 25, label: 'unlikely' },
  { minimum: 10, label: 'very unlikely' },
  { minimum: 0, label: 'remote' },
] as const

export type ProbabilityWord = (typeof probabilityBands)[number]['label']

export const probabilityWord = (percentage: number): ProbabilityWord => {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError('Probability percentage must be between 0 and 100')
  }

  const band = probabilityBands.find(({ minimum }) => percentage >= minimum)

  if (band === undefined) {
    throw new RangeError('Probability percentage has no house-scale band')
  }

  return band.label
}
