import Dexie, { type EntityTable } from 'dexie'
import type { GameSession } from '../domain/combatState'
import type { Roster } from '../domain/roster'

export type SavedAnalysis = Readonly<{
  key: string
  payload: unknown
  createdAt: string
}>

export type StoredPreference = Readonly<{
  key: string
  value: unknown
}>

export type DataMeta = Readonly<{
  key: string
  value: string | number
}>

export class CommitDatabase extends Dexie {
  rosters!: EntityTable<Roster, 'id'>
  sessions!: EntityTable<GameSession, 'id'>
  savedAnalyses!: EntityTable<SavedAnalysis, 'key'>
  preferences!: EntityTable<StoredPreference, 'key'>
  meta!: EntityTable<DataMeta, 'key'>

  constructor(name = 'commit') {
    super(name)
    this.version(1).stores({
      rosters: '&id, role, updatedAt',
      sessions: '&id, updatedAt',
      savedAnalyses: '&key, createdAt',
      preferences: '&key',
      meta: '&key',
    })
  }
}

export const db = new CommitDatabase()
