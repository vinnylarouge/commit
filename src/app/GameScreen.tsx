import { useState } from 'react'
import { RecommendationCard } from '../components/RecommendationCard'
import type {
  AttackerSetup,
  CombatMode,
  DefenderSetup,
  ProfileOverride,
} from '../domain/combatState'
import { demoMyRoster, demoOpponentRoster } from '../domain/demoData'
import type { UnitId, WeaponId } from '../domain/ids'
import { presentCommitment, type RecommendationView } from '../domain/plans'
import type { UnitProfile } from '../domain/profiles'
import { confidencePresets, probabilityWord } from '../domain/probability'
import { configureTarget } from '../engine/combat/configure'
import { setPreference, usePreferences } from '../stores/preferences'
import { setupForUnit, useGameStore } from '../stores/game'
import { useRosterStore } from '../stores/rosters'
import { analyseCommitment } from '../workers/client'

const modes: ReadonlyArray<Readonly<{ value: CombatMode; label: string; note: string }>> = [
  { value: 'shoot', label: 'Shoot', note: 'Ranged weapons only' },
  { value: 'fight', label: 'Fight', note: 'Melee weapons only' },
  { value: 'both', label: 'Shoot + Fight', note: 'Count both for each unit' },
]

const signedOptions = [-2, -1, 0, 1, 2] as const
const rerollOptions = [
  { value: 'profile', label: 'Use profile' },
  { value: 'none', label: 'None' },
  { value: 'ones', label: 'Rolls of 1' },
  { value: 'failed', label: 'All failed' },
] as const

const saveOverrides: ReadonlyArray<Readonly<{ value: string; label: string }>> = [
  { value: 'profile', label: 'Use profile' },
  { value: 'none', label: 'None' },
  ...[2, 3, 4, 5, 6].map((value) => ({ value: String(value), label: `${value}+` })),
]

const asOverride = (value: string): ProfileOverride =>
  value === 'profile' || value === 'none' ? value : Number(value) as ProfileOverride

const clampInteger = (value: string, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || 0)))

const phaseWeapons = (unit: UnitProfile, phase: 'shoot' | 'fight') =>
  unit.weapons.filter((weapon) => (weapon.phase ?? 'shoot') === phase)

const signedLabel = (value: number): string => value === 0 ? 'None' : value > 0 ? `+${value}` : String(value)

const modifierSummary = (setup: AttackerSetup): string => {
  const active = [
    setup.modifiers.hitModifier === 0 ? null : `${signedLabel(setup.modifiers.hitModifier)} hit`,
    setup.modifiers.woundModifier === 0 ? null : `${signedLabel(setup.modifiers.woundModifier)} wound`,
    setup.modifiers.rerollHits === 'profile' ? null : 'hit re-roll',
    setup.modifiers.rerollWounds === 'profile' ? null : 'wound re-roll',
    setup.modifiers.lethalHits ? 'Lethal Hits' : null,
    setup.modifiers.sustainedHits > 0 ? `Sustained ${setup.modifiers.sustainedHits}` : null,
    setup.modifiers.devastatingWounds ? 'Devastating Wounds' : null,
  ].filter((value): value is string => value !== null)
  return active.length === 0 ? 'Profile rules only' : active.join(', ')
}

type AttackerCardProps = Readonly<{
  unit: UnitProfile
  mode: CombatMode
  selected: boolean
  disabled: boolean
  setup: AttackerSetup
  onToggle: () => void
  onChange: (transform: (setup: AttackerSetup) => AttackerSetup) => void
}>

function AttackerCard({ unit, mode, selected, disabled, setup, onToggle, onChange }: AttackerCardProps) {
  const shooting = phaseWeapons(unit, 'shoot')
  const fighting = phaseWeapons(unit, 'fight')
  const updateModifiers = (change: Partial<AttackerSetup['modifiers']>) =>
    onChange((current) => ({ ...current, modifiers: { ...current.modifiers, ...change } }))

  return (
    <article className={selected ? 'attacker-card selected' : 'attacker-card'} aria-label={`${unit.name} setup`}>
      <label className="attacker-choice">
        <input type="checkbox" checked={selected} disabled={disabled} onChange={onToggle} />
        <span><strong>{unit.name}</strong><small>{unit.models} models saved</small></span>
      </label>
      {!selected ? null : (
        <div className="attacker-setup">
          <label><span>Models attacking</span><input name={`${unit.id}-models`} inputMode="numeric" type="number" min="1" max="100" value={setup.modelCount} onChange={(event) => onChange((current) => ({ ...current, modelCount: clampInteger(event.currentTarget.value, 1, 100) }))} /></label>
          {mode === 'fight' ? null : (
            <label className="wide"><span>Shooting weapon</span><select value={setup.shootWeaponId ?? ''} onChange={(event) => onChange((current) => ({ ...current, shootWeaponId: event.currentTarget.value as WeaponId }))}><option value="" disabled>No shooting weapon</option>{shooting.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name}</option>)}</select></label>
          )}
          {mode === 'shoot' ? null : (
            <label className="wide"><span>Fight weapon</span><select value={setup.fightWeaponId ?? ''} onChange={(event) => onChange((current) => ({ ...current, fightWeaponId: event.currentTarget.value as WeaponId }))}><option value="" disabled>No fight weapon</option>{fighting.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name}</option>)}</select></label>
          )}
          <details className="attacker-modifiers">
            <summary><span>Attacker modifiers</span><small>{modifierSummary(setup)}</small></summary>
            <div className="modifier-grid">
              <label><span>Hit roll</span><select value={setup.modifiers.hitModifier} onChange={(event) => updateModifiers({ hitModifier: Number(event.currentTarget.value) })}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
              <label><span>Wound roll</span><select value={setup.modifiers.woundModifier} onChange={(event) => updateModifiers({ woundModifier: Number(event.currentTarget.value) })}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
              <label><span>Re-roll hits</span><select value={setup.modifiers.rerollHits} onChange={(event) => updateModifiers({ rerollHits: event.currentTarget.value as AttackerSetup['modifiers']['rerollHits'] })}>{rerollOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span>Re-roll wounds</span><select value={setup.modifiers.rerollWounds} onChange={(event) => updateModifiers({ rerollWounds: event.currentTarget.value as AttackerSetup['modifiers']['rerollWounds'] })}>{rerollOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="choice-line"><input type="checkbox" checked={setup.modifiers.lethalHits} onChange={(event) => updateModifiers({ lethalHits: event.currentTarget.checked })} /><span>Lethal Hits</span></label>
              <label className="choice-line"><input type="checkbox" checked={setup.modifiers.devastatingWounds} onChange={(event) => updateModifiers({ devastatingWounds: event.currentTarget.checked })} /><span>Devastating Wounds</span></label>
              <label><span>Sustained Hits</span><input type="number" min="0" max="3" value={setup.modifiers.sustainedHits} onChange={(event) => updateModifiers({ sustainedHits: clampInteger(event.currentTarget.value, 0, 3) })} /></label>
            </div>
          </details>
        </div>
      )}
    </article>
  )
}

type AnalysisState =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'pending'; completed: number; total: number }>
  | Readonly<{ kind: 'success'; recommendation: RecommendationView }>
  | Readonly<{ kind: 'failure'; message: string }>

export function GameScreen() {
  const { confidence } = usePreferences()
  const session = useGameStore((state) => state.session)
  const persistenceError = useGameStore((state) => state.persistenceError)
  const selectTarget = useGameStore((state) => state.selectTarget)
  const toggleAttacker = useGameStore((state) => state.toggleAttacker)
  const setMode = useGameStore((state) => state.setMode)
  const updateAttackerSetup = useGameStore((state) => state.updateAttackerSetup)
  const updateDefenderSetup = useGameStore((state) => state.updateDefenderSetup)
  const [analysis, setAnalysis] = useState<AnalysisState>({ kind: 'idle' })

  const rosters = useRosterStore((state) => state.rosters)
  const myRoster = rosters.find(({ id }) => id === session.myRosterId) ?? demoMyRoster
  const opponentRoster = rosters.find(({ id }) => id === session.opponentRosterId) ?? demoOpponentRoster
  const target = opponentRoster.units.find(({ id }) => id === session.selectedTargetId)
  if (target === undefined) return <p role="alert">The selected target is missing from this roster.</p>

  const invalidate = (change: () => void) => {
    change()
    setAnalysis({ kind: 'idle' })
  }

  const updateDefender = (change: Partial<DefenderSetup>) => invalidate(() =>
    updateDefenderSetup((current) => ({ ...current, ...change })))

  const calculate = async () => {
    const configuredTarget = configureTarget(target, session.defenderSetup)
    setAnalysis({ kind: 'pending', completed: 0, total: session.selectedAttackerIds.length })
    try {
      const result = await analyseCommitment({
        kind: 'optimise-commitment',
        target: configuredTarget,
        targetWoundsRemaining: configuredTarget.models * configuredTarget.woundsPerModel,
        attackers: myRoster.units,
        selectedAttackerIds: session.selectedAttackerIds,
        attackerSetups: session.attackerSetups,
        mode: session.mode,
        requiredConfidence: confidence / 100,
        targetUnsupportedRules: target.unsupportedRules,
      }, (completed, total) => setAnalysis({ kind: 'pending', completed, total }))
      setAnalysis({ kind: 'success', recommendation: presentCommitment(result) })
    } catch (error: unknown) {
      setAnalysis({ kind: 'failure', message: error instanceof Error ? error.message : 'The analysis could not be completed.' })
    }
  }

  return (
    <>
      <section className="plan-hero">
        <p className="eyebrow">Pre-game plan</p>
        <h1>What is the least you need?</h1>
        <p>Set up one target and the units that could attack it. Commit calculates the smallest reliable plan before the game begins.</p>
      </section>

      {persistenceError === null ? null : <p className="notice warning" role="status">Your current inputs still work, but they could not be saved: {persistenceError}</p>}

      <section className="brief" aria-label="Commitment setup">
        <fieldset className="field-group">
          <legend className="eyebrow">Attack type</legend>
          <div className="mode-selector">
            {modes.map((mode) => (
              <label key={mode.value}>
                <input type="radio" name="mode" checked={session.mode === mode.value} onChange={() => invalidate(() => setMode(mode.value))} />
                <span><strong>{mode.label}</strong><small>{mode.note}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Target</legend>
          <div className="target-list">
            {opponentRoster.units.map((unit) => (
              <label className="target-card selectable" key={unit.id}>
                <input type="radio" name="target" checked={target.id === unit.id} onChange={() => invalidate(() => selectTarget(unit))} />
                <span className="target-copy"><strong>{unit.name}</strong><span>{unit.models} models · T{unit.toughness} · {unit.armourSave}+ save · {unit.woundsPerModel}W</span></span>
              </label>
            ))}
          </div>
          <div className="defender-setup">
            <h2>Target conditions</h2>
            <p>Override only what changes in this matchup.</p>
            <div className="modifier-grid">
              <label><span>Models in target</span><input type="number" min="1" max="100" value={session.defenderSetup.modelCount} onChange={(event) => updateDefender({ modelCount: clampInteger(event.currentTarget.value, 1, 100) })} /></label>
              <label><span>Toughness</span><select value={session.defenderSetup.toughnessModifier} onChange={(event) => updateDefender({ toughnessModifier: Number(event.currentTarget.value) })}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
              <label><span>Save roll</span><select value={session.defenderSetup.saveModifier} onChange={(event) => updateDefender({ saveModifier: Number(event.currentTarget.value) })}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
              <label><span>Re-roll saves</span><select value={session.defenderSetup.rerollSaves} onChange={(event) => updateDefender({ rerollSaves: event.currentTarget.value as DefenderSetup['rerollSaves'] })}><option value="none">None</option><option value="ones">Rolls of 1</option><option value="failed">All failed</option></select></label>
              <label><span>Invulnerable save</span><select value={String(session.defenderSetup.invulnerableSave)} onChange={(event) => updateDefender({ invulnerableSave: asOverride(event.currentTarget.value) })}>{saveOverrides.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span>Feel No Pain</span><select value={String(session.defenderSetup.feelNoPain)} onChange={(event) => updateDefender({ feelNoPain: asOverride(event.currentTarget.value) })}>{saveOverrides.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="choice-line"><input type="checkbox" checked={session.defenderSetup.benefitOfCover} onChange={(event) => updateDefender({ benefitOfCover: event.currentTarget.checked })} /><span>Benefit of Cover</span></label>
            </div>
          </div>
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Confidence</legend>
          {confidencePresets.map((option) => (
            <label className="choice-line" key={option.value}>
              <input type="radio" name="confidence" checked={confidence === option.value} onChange={() => { setPreference('confidence', option.value); setAnalysis({ kind: 'idle' }) }} />
              <span>{option.label}</span>
              <strong className="figure">{option.value}%, {probabilityWord(option.value)}</strong>
            </label>
          ))}
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Possible attackers</legend>
          <p className="section-help">Choose up to six units. Set the number of models and the weapon each one would use.</p>
          <div className="attacker-list configured">
            {myRoster.units.map((unit) => {
              const selected = session.selectedAttackerIds.includes(unit.id)
              return (
                <AttackerCard
                  key={unit.id}
                  unit={unit}
                  mode={session.mode}
                  selected={selected}
                  disabled={!selected && session.selectedAttackerIds.length >= 6}
                  setup={session.attackerSetups[unit.id] ?? setupForUnit(unit)}
                  onToggle={() => invalidate(() => toggleAttacker(unit.id))}
                  onChange={(transform) => invalidate(() => updateAttackerSetup(unit.id, transform))}
                />
              )
            })}
          </div>
        </fieldset>

        <button className="primary-action" type="button" disabled={session.selectedAttackerIds.length === 0 || analysis.kind === 'pending'} onClick={() => void calculate()}>
          {analysis.kind === 'pending' ? 'Calculating exact odds…' : 'Find least commitment'}
        </button>
        {analysis.kind === 'pending' ? <p className="progress-copy" role="status">Analysing {analysis.completed + 1} of {Math.max(analysis.total, 1)} units</p> : null}
        {analysis.kind === 'failure' ? <div className="notice error" role="alert"><strong>Calculation stopped</strong><p>{analysis.message}</p><button className="text-action" type="button" onClick={() => void calculate()}>Try again</button></div> : null}
      </section>

      {analysis.kind !== 'success' ? null : <RecommendationCard recommendation={analysis.recommendation} />}
    </>
  )
}
