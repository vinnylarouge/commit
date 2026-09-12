import { beforeEach, describe, expect, it } from 'vitest'
import { demoMyRoster, demoOpponentRoster } from '../domain/demoData'
import { sessionId } from '../domain/ids'
import { db } from '../persistence/db'
import { createDemoSession, useGameStore } from './game'

describe('game session store', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useGameStore.setState({ session: createDemoSession(), hydrated: false, persistenceError: null })
  })

  it('hydrates and persists the demo game in IndexedDB', async () => {
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().hydrated).toBe(true)
    expect(await db.sessions.get(sessionId('current-game'))).toBeDefined()
  })

  it('removes an activated attacker and records target damage', async () => {
    const attacker = demoMyRoster.units[0]
    const target = demoOpponentRoster.units[0]
    if (attacker === undefined || target === undefined) throw new Error('Demo fixture is empty')

    useGameStore.getState().resolveAttack(attacker.id, target.id, 4)
    const session = useGameStore.getState().session
    expect(session.units[attacker.id]?.hasActivated).toBe(true)
    expect(session.units[target.id]?.woundsRemaining).toBe(4)
    expect(session.selectedAttackerIds).not.toContain(attacker.id)
  })

  it('resets activations on the next turn', () => {
    const attacker = demoMyRoster.units[0]
    const target = demoOpponentRoster.units[0]
    if (attacker === undefined || target === undefined) throw new Error('Demo fixture is empty')
    useGameStore.getState().resolveAttack(attacker.id, target.id, 4)
    useGameStore.getState().nextTurn()
    expect(useGameStore.getState().session.turn).toBe(2)
    expect(useGameStore.getState().session.units[attacker.id]?.hasActivated).toBe(false)
  })
})
