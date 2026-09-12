import type { RosterId } from './ids'
import type { UnitProfile } from './profiles'

export type RosterRole = 'mine' | 'opponent'

export type Roster = Readonly<{
  id: RosterId
  name: string
  faction: string
  role: RosterRole
  units: ReadonlyArray<UnitProfile>
  source: 'demo' | 'paste' | 'manual' | 'file'
  rawText?: string
  updatedAt: string
}>
