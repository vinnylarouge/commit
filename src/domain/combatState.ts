import type { RosterId, SessionId, UnitId } from './ids'

export type GamePhase = 'command' | 'movement' | 'shooting' | 'charge' | 'fight'

export type UnitState = Readonly<{
  unitId: UnitId
  woundsRemaining: number
  hasActivated: boolean
}>

export type GameSession = Readonly<{
  id: SessionId
  myRosterId: RosterId
  opponentRosterId: RosterId
  turn: number
  phase: GamePhase
  commandPoints: number
  selectedTargetId: UnitId
  selectedAttackerIds: ReadonlyArray<UnitId>
  units: Readonly<Record<string, UnitState>>
  updatedAt: string
}>
