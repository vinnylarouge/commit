import { describe, expect, it } from 'vitest'
import { parseRoster, plainTextRosterParser } from './plainText'

const usefulRoster = `Roster: Spearhead
Faction: Adeptus Astartes

3x Eradicators (200 points)
T 6, Sv 3+, W 3
Melta rifles: A 6, BS 3+, S 9, AP -4, D D6

Ballistus Dreadnought (170 points)
Models 1, T 10, Sv 2+, W 12
Ballistus lascannon: A 2, BS 3+, S 12, AP -3, D D6+1`

describe('plain-text roster adapter', () => {
  it('detects and canonicalises a useful pasted roster', () => {
    expect(plainTextRosterParser.detect(usefulRoster)).toBeGreaterThan(0.7)
    const result = parseRoster(usefulRoster)

    expect(result.roster.name).toBe('Spearhead')
    expect(result.roster.faction).toBe('Adeptus Astartes')
    expect(result.roster.units).toHaveLength(2)
    expect(result.roster.units[0]).toMatchObject({ name: 'Eradicators', models: 3, toughness: 6 })
    expect(result.roster.units[0]?.weapons[0]).toMatchObject({
      name: 'Melta rifles', skill: 3, strength: 9, armourPenetration: -4,
      damage: { kind: 'die', count: 1, sides: 6, modifier: 0 },
    })
    expect(result.issues).toHaveLength(0)
  })

  it('keeps incomplete input as editable placeholders with the raw text', () => {
    const result = parseRoster('Mystery unit (90 points)')

    expect(result.roster.rawText).toBe('Mystery unit (90 points)')
    expect(result.roster.units[0]?.name).toBe('Mystery unit')
    expect(result.issues.map(({ field }) => field)).toEqual(expect.arrayContaining([
      'models', 'toughness', 'armourSave', 'woundsPerModel', 'weapons',
    ]))
  })

  it('preserves rules it cannot model and parses Feel No Pain', () => {
    const result = parseRoster(`Test unit (100 points)\nModels 1, T 5, Sv 3+, W 4, FNP 5+\nQuantum shield: halve incoming damage`)

    expect(result.roster.units[0]?.feelNoPain).toBe(5)
    expect(result.roster.units[0]?.unsupportedRules).toContain('Quantum shield: halve incoming damage')
    expect(result.issues).toContainEqual(expect.objectContaining({ field: 'unsupportedRules' }))
  })
})
