import { beforeEach, describe, expect, it } from 'vitest'
import { demoMyRoster, demoOpponentRoster } from '../domain/demoData'
import { sessionId } from '../domain/ids'
import { db } from '../persistence/db'
import { createDemoSession, useGameStore } from './game'

describe('pre-game planning store', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useGameStore.setState({ session: createDemoSession(), hydrated: false, persistenceError: null })
  })

  it('hydrates and persists a planning session in IndexedDB', async () => {
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().hydrated).toBe(true)
    expect(await db.sessions.get(sessionId('current-plan'))).toBeDefined()
  })

  it('stores attack type, model count and attacker modifiers', () => {
    const attacker = demoMyRoster.units[0]
    if (attacker === undefined) throw new Error('Demo fixture is empty')
    useGameStore.getState().setMode('both')
    useGameStore.getState().updateAttackerSetup(attacker.id, (setup) => ({
      ...setup,
      modelCount: 2,
      modifiers: { ...setup.modifiers, hitModifier: 1, rerollWounds: 'failed' },
    }))
    const session = useGameStore.getState().session
    expect(session.mode).toBe('both')
    expect(session.attackerSetups[attacker.id]).toMatchObject({
      modelCount: 2,
      modifiers: { hitModifier: 1, rerollWounds: 'failed' },
    })
  })

  it('resets defender overrides when the target changes', () => {
    const target = demoOpponentRoster.units[1]
    if (target === undefined) throw new Error('Demo fixture is empty')
    useGameStore.getState().updateDefenderSetup((setup) => ({ ...setup, feelNoPain: 5 }))
    useGameStore.getState().selectTarget(target)
    expect(useGameStore.getState().session.defenderSetup).toMatchObject({
      modelCount: target.models,
      feelNoPain: 'profile',
    })
  })
})
