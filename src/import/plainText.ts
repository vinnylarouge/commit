import { rosterId, unitId, weaponId } from '../domain/ids'
import type { UnitProfile, WeaponProfile } from '../domain/profiles'
import type { Roster } from '../domain/roster'
import { parseDice } from '../domain/diceText'
import type { ParseIssue, ParseResult, RosterParser } from './types'

const slug = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 48) || 'unknown'

const integer = (line: string, labels: ReadonlyArray<string>): number | null => {
  const expression = new RegExp(`(?:^|[,;\\s])(?:${labels.join('|')})\\s*[:=]?\\s*(\\d+)`, 'i')
  const match = line.match(expression)
  return match?.[1] === undefined ? null : Number(match[1])
}

const save = (line: string, labels: ReadonlyArray<string>): number | null => {
  const expression = new RegExp(`(?:^|[,;\\s])(?:${labels.join('|')})\\s*[:=]?\\s*(\\d)\\+`, 'i')
  const match = line.match(expression)
  return match?.[1] === undefined ? null : Number(match[1])
}

type UnitDraft = {
  name: string
  points: number | null
  models: number | null
  toughness: number | null
  armourSave: number | null
  invulnerableSave: number | null
  feelNoPain: number | null
  woundsPerModel: number | null
  weapons: Array<WeaponProfile>
  unsupportedRules: Array<string>
}

const unitLine = (line: string): Readonly<{ name: string; points: number | null; models: number | null }> | null => {
  const match = line.match(/^(?:(\d+)\s*[x×]\s*)?(.+?)(?:\s*[[(](\d+)\s*(?:pts?|points?)?[\])])$/i)
  if (match === null || match[2] === undefined) return null
  return {
    name: match[2].trim(),
    points: match[3] === undefined ? null : Number(match[3]),
    models: match[1] === undefined ? null : Number(match[1]),
  }
}

const weaponLine = (line: string, unitIndex: number): Readonly<{
  weapon: WeaponProfile
  issues: ReadonlyArray<ParseIssue>
}> | null => {
  const name = line.match(/^([^:]+):/i)?.[1]?.trim()
  const attacksSource = line.match(/(?:^|[,;\s])(?:A|Attacks)\s*[:=]?\s*(\d+|\d*D\d+(?:[+-]\d+)?)/i)?.[1]
  if (name === undefined || attacksSource === undefined) return null
  const parsedAttacks = parseDice(attacksSource)
  const parsedDamage = parseDice(line.match(/(?:^|[,;\s])(?:D|Damage)\s*[:=]?\s*(\d+|\d*D\d+(?:[+-]\d+)?)/i)?.[1] ?? '')
  const skill = save(line, ['BS', 'WS', 'Skill'])
  const strength = integer(line, ['S', 'Strength'])
  const ap = line.match(/(?:^|[,;\s])AP\s*[:=]?\s*(-?\d+)/i)?.[1]
  const issues: Array<ParseIssue> = []
  if (parsedAttacks === null) issues.push({ unitIndex, field: 'attacks', message: `${name}: add attacks` })
  if (skill === null) issues.push({ unitIndex, field: 'skill', message: `${name}: add BS or WS` })
  if (strength === null) issues.push({ unitIndex, field: 'strength', message: `${name}: add strength` })
  if (ap === undefined) issues.push({ unitIndex, field: 'armourPenetration', message: `${name}: add AP` })
  if (parsedDamage === null) issues.push({ unitIndex, field: 'damage', message: `${name}: add damage` })
  return {
    weapon: {
      id: weaponId(`paste-${unitIndex}-${slug(name)}`),
      name,
      phase: /\bWS\b/i.test(line) && !/\bBS\b/i.test(line) ? 'fight' : 'shoot',
      attacks: parsedAttacks ?? { kind: 'constant', value: 1 },
      skill: skill ?? 4,
      strength: strength ?? 4,
      armourPenetration: ap === undefined ? 0 : Number(ap),
      damage: parsedDamage ?? { kind: 'constant', value: 1 },
      keywords: [],
    },
    issues,
  }
}

const canonicalUnit = (
  draft: UnitDraft,
  index: number,
  issues: Array<ParseIssue>,
): UnitProfile => {
  const required: ReadonlyArray<readonly [keyof UnitDraft, number, string]> = [
    ['points', 0, 'points'],
    ['models', 1, 'model count'],
    ['toughness', 4, 'Toughness'],
    ['armourSave', 4, 'armour save'],
    ['woundsPerModel', 1, 'wounds per model'],
  ]
  const values = { ...draft }
  for (const [field, fallback, label] of required) {
    if (values[field] === null) {
      issues.push({ unitIndex: index, field, message: `${draft.name}: add ${label}` })
      Object.assign(values, { [field]: fallback })
    }
  }
  if (draft.weapons.length === 0) {
    issues.push({ unitIndex: index, field: 'weapons', message: `${draft.name}: add a weapon if this unit attacks` })
  }
  return {
    id: unitId(`paste-${index}-${slug(draft.name)}`),
    name: draft.name,
    points: values.points ?? 0,
    models: values.models ?? 1,
    toughness: values.toughness ?? 4,
    armourSave: values.armourSave ?? 4,
    invulnerableSave: values.invulnerableSave,
    woundsPerModel: values.woundsPerModel ?? 1,
    feelNoPain: values.feelNoPain,
    keywords: [],
    weapons: draft.weapons,
    abilities: [],
    unsupportedRules: draft.unsupportedRules,
  }
}

export const plainTextRosterParser: RosterParser = {
  id: 'plain-text-statline',
  detect: (input) => {
    if (input.trim().length === 0) return 0
    const signals = [/(?:Roster|Faction)\s*:/i, /\bT(?:oughness)?\s*[:=]?\s*\d+/i, /\b(?:BS|WS)\s*[:=]?\s*\d\+/i, /\bAP\s*[:=]?\s*-?\d+/i]
    return signals.filter((signal) => signal.test(input)).length / signals.length
  },
  parse: (input): ParseResult => {
    const lines = input.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean)
    const rosterName = lines.find((line) => /^Roster\s*:/i.test(line))?.replace(/^Roster\s*:\s*/i, '').trim() || 'Imported roster'
    const faction = lines.find((line) => /^Faction\s*:/i.test(line))?.replace(/^Faction\s*:\s*/i, '').trim() || 'Unknown faction'
    const issues: Array<ParseIssue> = []
    const drafts: Array<UnitDraft> = []
    let current: UnitDraft | null = null

    for (const line of lines) {
      if (/^(Roster|Faction)\s*:/i.test(line)) continue
      const heading = unitLine(line)
      if (heading !== null) {
        current = {
          name: heading.name,
          points: heading.points,
          models: heading.models,
          toughness: null,
          armourSave: null,
          invulnerableSave: null,
          feelNoPain: null,
          woundsPerModel: null,
          weapons: [],
          unsupportedRules: [],
        }
        drafts.push(current)
        continue
      }
      if (current === null) {
        current = {
          name: line.replace(/^[-•]\s*/, '') || 'Unknown unit',
          points: null,
          models: null,
          toughness: null,
          armourSave: null,
          invulnerableSave: null,
          feelNoPain: null,
          woundsPerModel: null,
          weapons: [],
          unsupportedRules: [],
        }
        drafts.push(current)
        issues.push({ unitIndex: drafts.length - 1, field: 'name', message: `Check unrecognised entry: ${line}` })
        continue
      }
      const parsedWeapon = weaponLine(line, drafts.length - 1)
      if (parsedWeapon !== null) {
        current.weapons.push(parsedWeapon.weapon)
        issues.push(...parsedWeapon.issues)
        continue
      }
      const models = integer(line, ['Models?', 'Count'])
      const toughness = integer(line, ['T', 'Toughness'])
      const armourSave = save(line, ['Sv', 'Save'])
      const invulnerableSave = save(line, ['Inv', 'Invulnerable'])
      const feelNoPain = save(line, ['FNP', 'Feel No Pain'])
      const woundsPerModel = integer(line, ['W', 'Wounds?'])
      current.models = models ?? current.models
      current.toughness = toughness ?? current.toughness
      current.armourSave = armourSave ?? current.armourSave
      current.invulnerableSave = invulnerableSave ?? current.invulnerableSave
      current.feelNoPain = feelNoPain ?? current.feelNoPain
      current.woundsPerModel = woundsPerModel ?? current.woundsPerModel
      if ([models, toughness, armourSave, invulnerableSave, feelNoPain, woundsPerModel].every((value) => value === null)) {
        current.unsupportedRules.push(line)
        issues.push({ unitIndex: drafts.length - 1, field: 'unsupportedRules', message: `Check unsupported rule: ${line}` })
      }
    }

    if (drafts.length === 0) {
      drafts.push({
        name: 'Unknown unit', points: null, models: null, toughness: null,
        armourSave: null, invulnerableSave: null, feelNoPain: null, woundsPerModel: null, weapons: [], unsupportedRules: [],
      })
      issues.push({ unitIndex: 0, field: 'name', message: 'No unit heading was recognised. Edit this placeholder.' })
    }
    const units = drafts.map((draft, index) => canonicalUnit(draft, index, issues))
    const now = new Date().toISOString()
    const roster: Roster = {
      id: rosterId(`paste-${slug(rosterName)}-${Date.now()}`),
      name: rosterName,
      faction,
      role: 'mine',
      units,
      source: 'paste',
      rawText: input,
      updatedAt: now,
    }
    const recognisedFields = units.reduce((total, unit) => total + 5 + unit.weapons.length * 5, 0)
    const confidence = Math.max(0, Math.min(1, recognisedFields / Math.max(1, recognisedFields + issues.length)))
    return { roster, confidence, issues }
  },
}

export const detectRosterParser = (input: string): RosterParser => {
  const parsers: ReadonlyArray<RosterParser> = [plainTextRosterParser]
  return [...parsers].sort((left, right) => right.detect(input) - left.detect(input))[0] ?? plainTextRosterParser
}

export const parseRoster = (input: string): ParseResult => detectRosterParser(input).parse(input)
