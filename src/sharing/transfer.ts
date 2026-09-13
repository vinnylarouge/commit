import type { SandboxState } from '../domain/sandbox'
import { isSandboxState } from './sandboxState'

export type CommitMatchupFile = Readonly<{
  format: 'commit-matchup'
  version: 1
  exportedAt: string
  state: SandboxState
}>

export const serialiseMatchup = (state: SandboxState): string => JSON.stringify({
  format: 'commit-matchup',
  version: 1,
  exportedAt: new Date().toISOString(),
  state,
} satisfies CommitMatchupFile, null, 2)

export const parseMatchupFile = (input: string): SandboxState => {
  const parsed: unknown = JSON.parse(input)
  if (typeof parsed !== 'object' || parsed === null) throw new Error('This is not a Commit matchup file.')
  const file = parsed as Record<string, unknown>
  if (file.format !== 'commit-matchup' || file.version !== 1 || typeof file.state !== 'object' || file.state === null) {
    throw new Error('This Commit file version is not supported.')
  }
  if (!isSandboxState(file.state)) {
    throw new Error('The matchup file is incomplete.')
  }
  return file.state
}

export const downloadMatchup = (state: SandboxState): void => {
  const url = URL.createObjectURL(new Blob([serialiseMatchup(state)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `commit-${state.attacker.name}-${state.target.name}.commit.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
