import Dexie, { type EntityTable } from 'dexie'
import type { GameSession } from '../domain/combatState'
import type { Roster } from '../domain/roster'
import type { UnitProfile } from '../domain/profiles'
import type { SandboxState } from '../domain/sandbox'

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

export type SavedMatchup = Readonly<{
  id: string
  name: string
  state: SandboxState
  updatedAt: string
}>

export class CommitDatabase extends Dexie {
  rosters!: EntityTable<Roster, 'id'>
  profiles!: EntityTable<UnitProfile, 'id'>
  sessions!: EntityTable<GameSession, 'id'>
  savedAnalyses!: EntityTable<SavedAnalysis, 'key'>
  savedMatchups!: EntityTable<SavedMatchup, 'id'>
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
    this.version(2).stores({
      rosters: '&id, role, updatedAt',
      profiles: '&id, name',
      sessions: '&id, updatedAt',
      savedAnalyses: '&key, createdAt',
      preferences: '&key',
      meta: '&key',
    })
    this.version(3).stores({
      rosters: '&id, role, updatedAt',
      profiles: '&id, name',
      sessions: '&id, updatedAt',
      savedAnalyses: '&key, createdAt',
      savedMatchups: '&id, updatedAt',
      preferences: '&key',
      meta: '&key',
    })
  }
}

export const db = new CommitDatabase()
