import { describe, expect, it } from 'vitest'
import { deathshroud, eradicators } from '../domain/demoData'
import { defaultSandboxModifiers, type SandboxState } from '../domain/sandbox'
import { parseMatchupFile, serialiseMatchup } from './transfer'

const state: SandboxState = {
  version: 1,
  attacker: eradicators,
  target: deathshroud,
  modifiers: defaultSandboxModifiers,
}

describe('portable matchup files', () => {
  it('round trips the versioned state', () => {
    expect(parseMatchupFile(serialiseMatchup(state))).toEqual(state)
  })

  it('rejects unrelated JSON', () => {
    expect(() => parseMatchupFile('{"hello":"world"}')).toThrow('not supported')
  })

  it('rejects a labelled file whose profile data is incomplete', () => {
    expect(() => parseMatchupFile('{"format":"commit-matchup","version":1,"state":{"version":1}}'))
      .toThrow('incomplete')
  })
})
