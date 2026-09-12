import type { UnitProfile } from './profiles'

export type OutcomeOption = Readonly<{ label: string; woundsRemaining: number }>

export const outcomeOptions = (
  target: UnitProfile,
  currentWounds: number,
): ReadonlyArray<OutcomeOption> => {
  if (target.models === 1) {
    return [
      ...[0, 1, 2, 3, 4, 5].map((damage) => ({
        label: damage === 5 ? '5+ damage' : `${damage} damage`,
        woundsRemaining: Math.max(0, currentWounds - damage),
      })),
      { label: 'Destroyed', woundsRemaining: 0 },
    ]
  }

  const remainingModels = Math.ceil(currentWounds / target.woundsPerModel)
  return [
    { label: '0 killed', woundsRemaining: currentWounds },
    ...Array.from({ length: Math.min(remainingModels - 1, 3) }, (_, index) => {
      const killed = index + 1
      return {
        label: `${killed} killed`,
        woundsRemaining: Math.max(0, currentWounds - killed * target.woundsPerModel),
      }
    }),
    { label: 'Unit destroyed', woundsRemaining: 0 },
  ]
}
