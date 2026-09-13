import { create } from 'zustand'
import { demoMyRoster, demoOpponentRoster } from '../domain/demoData'
import type { GameGoal, GamePhase, GameSession, UnitState } from '../domain/combatState'
import { sessionId, type UnitId } from '../domain/ids'
import type { Roster } from '../domain/roster'
import { ensureDemoData } from '../persistence/bootstrap'
import { db } from '../persistence/db'

const initialTarget = demoOpponentRoster.units[0]
if (initialTarget === undefined) throw new Error('Demo opponent roster is empty')

const now = () => new Date().toISOString()

const rosterUnitStates = (myRoster: Roster, opponentRoster: Roster): Readonly<Record<string, UnitState>> => Object.fromEntries(
  [...myRoster.units, ...opponentRoster.units].map((unit) => [
    unit.id,
    {
      unitId: unit.id,
      woundsRemaining: unit.models * unit.woundsPerModel,
      hasActivated: false,
    },
  ] as const),
)

export const createDemoSession = (): GameSession => ({
  id: sessionId('current-game'),
  myRosterId: demoMyRoster.id,
  opponentRosterId: demoOpponentRoster.id,
  turn: 1,
  phase: 'shooting',
  commandPoints: 2,
  selectedTargetId: initialTarget.id,
  selectedAttackerIds: demoMyRoster.units.slice(0, 3).map(({ id }) => id),
  goal: { kind: 'kill' },
  units: rosterUnitStates(demoMyRoster, demoOpponentRoster),
  updatedAt: now(),
})

type GameStore = Readonly<{
  session: GameSession
  hydrated: boolean
  persistenceError: string | null
  hydrate: () => Promise<void>
  selectTarget: (unitId: UnitId) => void
  toggleAttacker: (unitId: UnitId) => void
  setCommandPoints: (commandPoints: number) => void
  setPhase: (phase: GamePhase) => void
  setGoal: (goal: GameGoal) => void
  resolveAttack: (attackerId: UnitId, targetId: UnitId, woundsRemaining: number) => void
  nextTurn: () => void
  startGame: (myRoster: Roster, opponentRoster: Roster) => void
  resetDemo: () => void
}>

export const useGameStore = create<GameStore>((set, get) => {
  const reportPersistenceError = (error: unknown) => set({
    persistenceError: error instanceof Error ? error.message : 'Could not save the current game',
  })

  const persist = (session: GameSession) => {
    void db.sessions.put(session).catch(reportPersistenceError)
  }

  const update = (transform: (session: GameSession) => GameSession) => {
    const session = { ...transform(get().session), updatedAt: now() }
    set({ session, persistenceError: null })
    persist(session)
  }

  return {
    session: createDemoSession(),
    hydrated: false,
    persistenceError: null,
    hydrate: async () => {
      try {
        await ensureDemoData()
        const stored = await db.sessions.get(sessionId('current-game'))
        const session = stored === undefined
          ? createDemoSession()
          : { ...stored, goal: stored.goal ?? { kind: 'kill' } }
        if (stored === undefined) await db.sessions.put(session)
        set({ session, hydrated: true, persistenceError: null })
      } catch (error: unknown) {
        set({
          hydrated: true,
          persistenceError: error instanceof Error ? error.message : 'Could not load the saved game',
        })
      }
    },
    selectTarget: (unitId) => update((session) => ({ ...session, selectedTargetId: unitId })),
    toggleAttacker: (unitId) => update((session) => ({
      ...session,
      selectedAttackerIds: session.selectedAttackerIds.includes(unitId)
        ? session.selectedAttackerIds.filter((id) => id !== unitId)
        : session.selectedAttackerIds.length >= 6
          ? session.selectedAttackerIds
          : [...session.selectedAttackerIds, unitId],
    })),
    setCommandPoints: (commandPoints) => update((session) => ({
      ...session,
      commandPoints: Math.max(0, Math.floor(commandPoints)),
    })),
    setPhase: (phase) => update((session) => ({ ...session, phase })),
    setGoal: (goal) => update((session) => ({ ...session, goal })),
    resolveAttack: (attackerId, targetId, woundsRemaining) => update((session) => ({
      ...session,
      units: {
        ...session.units,
        [attackerId]: {
          unitId: attackerId,
          woundsRemaining: session.units[attackerId]?.woundsRemaining ?? 0,
          hasActivated: true,
        },
        [targetId]: {
          unitId: targetId,
          woundsRemaining: Math.max(0, Math.floor(woundsRemaining)),
          hasActivated: session.units[targetId]?.hasActivated ?? false,
        },
      },
      selectedAttackerIds: session.selectedAttackerIds.filter((id) => id !== attackerId),
    })),
    nextTurn: () => update((session) => ({
      ...session,
      turn: session.turn + 1,
      phase: 'command',
      units: Object.fromEntries(Object.entries(session.units).map(([id, unit]) => [
        id,
        { ...unit, hasActivated: false },
      ])),
    })),
    startGame: (myRoster, opponentRoster) => {
      const firstTarget = opponentRoster.units[0]
      if (firstTarget === undefined) return
      const session: GameSession = {
        ...createDemoSession(),
        myRosterId: myRoster.id,
        opponentRosterId: opponentRoster.id,
        selectedTargetId: firstTarget.id,
        selectedAttackerIds: myRoster.units.filter(({ weapons }) => weapons.length > 0).slice(0, 6).map(({ id }) => id),
        units: rosterUnitStates(myRoster, opponentRoster),
        updatedAt: now(),
      }
      set({ session, persistenceError: null })
      persist(session)
      void db.preferences.get('recentOpponentIds').then((stored) => {
        const existing = Array.isArray(stored?.value)
          ? stored.value.filter((value): value is string => typeof value === 'string')
          : []
        return db.preferences.put({
          key: 'recentOpponentIds',
          value: [opponentRoster.id, ...existing.filter((id) => id !== opponentRoster.id)].slice(0, 5),
        })
      }).catch(reportPersistenceError)
    },
    resetDemo: () => {
      const session = createDemoSession()
      set({ session, persistenceError: null })
      persist(session)
    },
  }
})
