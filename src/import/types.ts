import type { Roster } from '../domain/roster'

export type ParseIssue = Readonly<{
  unitIndex: number | null
  field: string
  message: string
}>

export type ParseResult = Readonly<{
  roster: Roster
  confidence: number
  issues: ReadonlyArray<ParseIssue>
}>

export interface RosterParser {
  readonly id: string
  detect(input: string): number
  parse(input: string): ParseResult
}
