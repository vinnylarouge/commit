import { describe, expect, it } from 'vitest'
import { deathshroud, eradicators } from '../domain/demoData'
import { defaultSandboxModifiers, type SandboxState } from '../domain/sandbox'
import { decodeSandboxState, encodeSandboxState } from './sandboxState'

describe('compressed sandbox links', () => {
  it('round trips versioned state through URL-safe text', async () => {
    const state: SandboxState = {
      version: 1,
      attacker: eradicators,
      target: deathshroud,
      modifiers: defaultSandboxModifiers,
    }
    const encoded = await encodeSandboxState(state)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(await decodeSandboxState(encoded)).toEqual(state)
  })
})
