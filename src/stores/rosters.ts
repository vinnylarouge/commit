import { create } from 'zustand'
import { demoRosters } from '../domain/demoData'
import type { RosterId } from '../domain/ids'
import type { Roster } from '../domain/roster'
import { ensureDemoData } from '../persistence/bootstrap'
import { db } from '../persistence/db'

type RosterStore = Readonly<{
  rosters: ReadonlyArray<Roster>
  hydrated: boolean
  error: string | null
  hydrate: () => Promise<void>
  save: (roster: Roster) => Promise<void>
  remove: (rosterId: RosterId) => Promise<void>
}>

const newestFirst = (rosters: ReadonlyArray<Roster>): ReadonlyArray<Roster> =>
  [...rosters].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

export const useRosterStore = create<RosterStore>((set, get) => ({
  rosters: demoRosters,
  hydrated: false,
  error: null,
  hydrate: async () => {
    try {
      await ensureDemoData()
      set({ rosters: newestFirst(await db.rosters.toArray()), hydrated: true, error: null })
    } catch (error: unknown) {
      set({
        hydrated: true,
        error: error instanceof Error ? error.message : 'Could not load saved rosters',
      })
    }
  },
  save: async (roster) => {
    try {
      await db.transaction('rw', db.rosters, db.profiles, async () => {
        await db.rosters.put(roster)
        await db.profiles.bulkPut([...roster.units])
      })
      set({
        rosters: newestFirst([...get().rosters.filter(({ id }) => id !== roster.id), roster]),
        error: null,
      })
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Could not save roster' })
      throw error
    }
  },
  remove: async (rosterId) => {
    try {
      await db.rosters.delete(rosterId)
      set({ rosters: get().rosters.filter(({ id }) => id !== rosterId), error: null })
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Could not remove roster' })
      throw error
    }
  },
}))
