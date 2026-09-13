import { useMemo, useState } from 'react'
import { MatchupView } from '../components/MatchupView'
import { UnitEditor } from '../components/UnitEditor'
import { rosterId, unitId, weaponId, type RosterId } from '../domain/ids'
import type { UnitProfile } from '../domain/profiles'
import type { Roster, RosterRole } from '../domain/roster'
import { parseRoster } from '../import/plainText'
import type { ParseIssue } from '../import/types'
import { useGameStore } from '../stores/game'
import { useRosterStore } from '../stores/rosters'

const example = `Roster: Spearhead
Faction: Adeptus Astartes

3x Eradicators (200 points)
T 6, Sv 3+, W 3
Melta rifles: A 2, BS 3+, S 9, AP -4, D D6
Close combat weapons: A 3, WS 3+, S 4, AP 0, D 1`

const manualUnit = (): UnitProfile => ({
  id: unitId(`manual-unit-${Date.now()}`),
  name: 'New unit',
  points: 100,
  models: 1,
  toughness: 4,
  armourSave: 3,
  invulnerableSave: null,
  woundsPerModel: 3,
  feelNoPain: null,
  keywords: [],
  weapons: [{
    id: weaponId(`manual-weapon-${Date.now()}`),
    name: 'New weapon',
    phase: 'shoot',
    attacks: { kind: 'constant', value: 1 },
    skill: 3,
    strength: 4,
    armourPenetration: 0,
    damage: { kind: 'constant', value: 1 },
    keywords: [],
  }],
  abilities: [],
  unsupportedRules: [],
})

const manualRoster = (): Roster => ({
  id: rosterId(`manual-roster-${Date.now()}`),
  name: 'My custom roster',
  faction: 'Custom',
  role: 'mine',
  units: [manualUnit()],
  source: 'manual',
  updatedAt: new Date().toISOString(),
})

export function PrepScreen() {
  const rosters = useRosterStore((state) => state.rosters)
  const rosterError = useRosterStore((state) => state.error)
  const saveRoster = useRosterStore((state) => state.save)
  const startGame = useGameStore((state) => state.startGame)
  const session = useGameStore((state) => state.session)
  const [paste, setPaste] = useState('')
  const [draft, setDraft] = useState<Roster | null>(null)
  const [issues, setIssues] = useState<ReadonlyArray<ParseIssue>>([])
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [myRosterId, setMyRosterId] = useState<RosterId>(session.myRosterId)
  const [opponentRosterId, setOpponentRosterId] = useState<RosterId>(session.opponentRosterId)

  const mine = useMemo(() => rosters.filter(({ role }) => role === 'mine'), [rosters])
  const opponents = useMemo(() => rosters.filter(({ role }) => role === 'opponent'), [rosters])
  const myRoster = rosters.find(({ id }) => id === myRosterId) ?? mine[0]
  const opponentRoster = rosters.find(({ id }) => id === opponentRosterId) ?? opponents[0]

  const beginCorrection = (roster: Roster, parsedIssues: ReadonlyArray<ParseIssue> = []) => {
    setDraft(roster)
    setIssues(parsedIssues)
    setSavedMessage(null)
  }

  const updateUnit = (index: number, unit: UnitProfile, field?: string) => {
    if (draft === null) return
    beginCorrection({
      ...draft,
      units: draft.units.map((existing, unitIndex) => unitIndex === index ? unit : existing),
      updatedAt: new Date().toISOString(),
    }, field === undefined ? issues : issues.filter((issue) => issue.unitIndex !== index || issue.field !== field))
  }

  const parsePaste = () => {
    const result = parseRoster(paste)
    beginCorrection(result.roster, result.issues)
  }

  const saveDraft = async () => {
    if (draft === null || draft.units.length === 0 || draft.name.trim() === '') return
    const prepared = { ...draft, updatedAt: new Date().toISOString() }
    await saveRoster(prepared)
    if (prepared.role === 'mine') setMyRosterId(prepared.id)
    else setOpponentRosterId(prepared.id)
    setSavedMessage(`${prepared.name} saved on this device.`)
    setDraft(null)
    setIssues([])
  }

  const launchGame = () => {
    if (myRoster === undefined || opponentRoster === undefined) return
    startGame(myRoster, opponentRoster)
    window.location.hash = '#/game'
  }

  return (
    <>
      <section className="prep-hero">
        <p className="eyebrow">Prep</p>
        <h1>Know the matchup before the first roll.</h1>
        <p>Choose two saved rosters, or paste one in. Everything stays on this device.</p>
      </section>

      {rosterError === null ? null : <p className="notice error" role="alert">{rosterError}</p>}
      {savedMessage === null ? null : <p className="notice success" role="status">{savedMessage}</p>}

      <section className="roster-pickers" aria-labelledby="saved-rosters-heading">
        <p className="eyebrow">Saved rosters</p>
        <h2 id="saved-rosters-heading">Set up a game</h2>
        <div className="select-grid">
          <label><span>Your roster</span><select value={myRoster?.id ?? ''} onChange={(event) => setMyRosterId(event.currentTarget.value as RosterId)}>{mine.map((roster) => <option key={roster.id} value={roster.id}>{roster.name}</option>)}</select></label>
          <label><span>Opponent</span><select value={opponentRoster?.id ?? ''} onChange={(event) => setOpponentRosterId(event.currentTarget.value as RosterId)}>{opponents.map((roster) => <option key={roster.id} value={roster.id}>{roster.name}</option>)}</select></label>
        </div>
        <button className="primary-action" type="button" disabled={myRoster === undefined || opponentRoster === undefined} onClick={launchGame}>Use these rosters</button>
      </section>

      {myRoster === undefined || opponentRoster === undefined ? null : <MatchupView myRoster={myRoster} opponentRoster={opponentRoster} />}

      <section className="import-section" aria-labelledby="import-heading">
        <p className="eyebrow">Roster library</p>
        <h2 id="import-heading">Paste, check, save</h2>
        <p>Commit recognises simple unit, defence and weapon stat lines. Anything uncertain stays editable below.</p>
        <label className="paste-field">
          <span>Paste roster</span>
          <textarea value={paste} placeholder={example} onChange={(event) => setPaste(event.currentTarget.value)} />
        </label>
        <div className="button-row import-actions">
          <button className="quiet-action" type="button" onClick={() => beginCorrection(manualRoster())}>Create manually</button>
          <button className="primary-action" type="button" disabled={paste.trim() === ''} onClick={parsePaste}>Check roster</button>
        </div>
      </section>

      {draft === null ? null : (
        <section className="correction-section" aria-labelledby="correction-heading">
          <p className="eyebrow">Correction</p>
          <h2 id="correction-heading">Check the profiles</h2>
          <p>{issues.length === 0 ? 'Everything needed was recognised.' : `${issues.length} fields need a quick check.`}</p>
          <div className="form-grid roster-fields">
            <label><span>Roster name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} /></label>
            <label><span>Faction</span><input value={draft.faction} onChange={(event) => setDraft({ ...draft, faction: event.currentTarget.value })} /></label>
            <label><span>Use as</span><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.currentTarget.value as RosterRole })}><option value="mine">My roster</option><option value="opponent">Opponent roster</option></select></label>
          </div>
          <div className="editor-list">
            {draft.units.map((unit, index) => (
              <UnitEditor
                key={unit.id}
                unit={unit}
                index={String(index)}
                issues={issues.filter(({ unitIndex }) => unitIndex === index)}
                onChange={(next, field) => updateUnit(index, next, field)}
                onAccept={() => setIssues(issues.filter(({ unitIndex }) => unitIndex !== index))}
                onRemove={() => setDraft({ ...draft, units: draft.units.filter((_, unitIndex) => unitIndex !== index) })}
              />
            ))}
          </div>
          <button className="quiet-action add-unit" type="button" onClick={() => setDraft({ ...draft, units: [...draft.units, manualUnit()] })}>Add unit</button>
          <button className="primary-action save-roster" type="button" disabled={draft.units.length === 0 || draft.name.trim() === ''} onClick={() => void saveDraft()}>Save roster</button>
        </section>
      )}
    </>
  )
}
