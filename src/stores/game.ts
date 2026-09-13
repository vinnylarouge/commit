import { create } from 'zustand'
import { demoMyRoster, demoOpponentRoster } from '../domain/demoData'
import type {
  AttackerModifiers,
  AttackerSetup,
  CombatMode,
  DefenderSetup,
  GameSession,
} from '../domain/combatState'
import { sessionId, type UnitId } from '../domain/ids'
import type { UnitProfile } from '../domain/profiles'
import type { Roster } from '../domain/roster'
import { ensureDemoData } from '../persistence/bootstrap'
import { db } from '../persistence/db'

const initialTarget = demoOpponentRoster.units[0]
if (initialTarget === undefined) throw new Error('Demo opponent roster is empty')

const now = () => new Date().toISOString()

export const defaultAttackerModifiers: AttackerModifiers = {
  hitModifier: 0,
  woundModifier: 0,
  rerollHits: 'profile',
  rerollWounds: 'profile',
  lethalHits: false,
  sustainedHits: 0,
  devastatingWounds: false,
}

const weaponForPhase = (unit: UnitProfile, phase: 'shoot' | 'fight') =>
  unit.weapons.find((weapon) => (weapon.phase ?? 'shoot') === phase)?.id ?? null

export const setupForUnit = (unit: UnitProfile): AttackerSetup => ({
  unitId: unit.id,
  modelCount: unit.models,
  shootWeaponId: weaponForPhase(unit, 'shoot'),
  fightWeaponId: weaponForPhase(unit, 'fight'),
  modifiers: defaultAttackerModifiers,
})

const setupsForRoster = (roster: Roster): Readonly<Record<string, AttackerSetup>> =>
  Object.fromEntries(roster.units.map((unit) => [unit.id, setupForUnit(unit)]))

const setupForTarget = (unit: UnitProfile): DefenderSetup => ({
  modelCount: unit.models,
  toughnessModifier: 0,
  saveModifier: 0,
  rerollSaves: 'none',
  benefitOfCover: false,
  invulnerableSave: 'profile',
  feelNoPain: 'profile',
})

export const createDemoSession = (): GameSession => ({
  id: sessionId('current-plan'),
  myRosterId: demoMyRoster.id,
  opponentRosterId: demoOpponentRoster.id,
  mode: 'shoot',
  selectedTargetId: initialTarget.id,
  selectedAttackerIds: demoMyRoster.units.slice(0, 3).map(({ id }) => id),
  attackerSetups: setupsForRoster(demoMyRoster),
  defenderSetup: setupForTarget(initialTarget),
  updatedAt: now(),
})

const isCurrentSession = (session: GameSession): boolean =>
  ['shoot', 'fight', 'both'].includes(session.mode)
  && typeof session.attackerSetups === 'object'
  && typeof session.defenderSetup === 'object'

type GameStore = Readonly<{
  session: GameSession
  hydrated: boolean
  persistenceError: string | null
  hydrate: () => Promise<void>
  selectTarget: (unit: UnitProfile) => void
  toggleAttacker: (unitId: UnitId) => void
  setMode: (mode: CombatMode) => void
  updateAttackerSetup: (unitId: UnitId, transform: (setup: AttackerSetup) => AttackerSetup) => void
  updateDefenderSetup: (transform: (setup: DefenderSetup) => DefenderSetup) => void
  startGame: (myRoster: Roster, opponentRoster: Roster) => void
  resetDemo: () => void
}>

export const useGameStore = create<GameStore>((set, get) => {
  const reportPersistenceError = (error: unknown) => set({
    persistenceError: error instanceof Error ? error.message : 'Could not save this plan',
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
        const stored = await db.sessions.get(sessionId('current-plan'))
        const session = stored !== undefined && isCurrentSession(stored) ? stored : createDemoSession()
        if (stored === undefined || !isCurrentSession(stored)) await db.sessions.put(session)
        set({ session, hydrated: true, persistenceError: null })
      } catch (error: unknown) {
        set({
          hydrated: true,
          persistenceError: error instanceof Error ? error.message : 'Could not load the saved plan',
        })
      }
    },
    selectTarget: (unit) => update((session) => ({
      ...session,
      selectedTargetId: unit.id,
      defenderSetup: setupForTarget(unit),
    })),
    toggleAttacker: (unitId) => update((session) => ({
      ...session,
      selectedAttackerIds: session.selectedAttackerIds.includes(unitId)
        ? session.selectedAttackerIds.filter((id) => id !== unitId)
        : session.selectedAttackerIds.length >= 6
          ? session.selectedAttackerIds
          : [...session.selectedAttackerIds, unitId],
    })),
    setMode: (mode) => update((session) => ({ ...session, mode })),
    updateAttackerSetup: (unitId, transform) => update((session) => {
      const current = session.attackerSetups[unitId]
      if (current === undefined) return session
      return { ...session, attackerSetups: { ...session.attackerSetups, [unitId]: transform(current) } }
    }),
    updateDefenderSetup: (transform) => update((session) => ({
      ...session,
      defenderSetup: transform(session.defenderSetup),
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
        attackerSetups: setupsForRoster(myRoster),
        defenderSetup: setupForTarget(firstTarget),
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
