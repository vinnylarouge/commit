import { useEffect, useMemo, useState } from 'react'
import { UnitEditor } from '../components/UnitEditor'
import { deathshroud, eradicators } from '../domain/demoData'
import { formatDice } from '../domain/diceText'
import type { UnitProfile } from '../domain/profiles'
import { probabilityWord } from '../domain/probability'
import { defaultSandboxModifiers, type SandboxState } from '../domain/sandbox'
import type { ProfileOverride } from '../domain/combatState'
import { analyseSandbox } from '../engine/combat/analyseSandbox'
import { cacheAnalysis, contentHash, pruneAnalysisCache } from '../persistence/cache'
import { db, type SavedMatchup } from '../persistence/db'
import { encodeSandboxState, sandboxStateFromHash } from '../sharing/sandboxState'
import { downloadMatchup, parseMatchupFile } from '../sharing/transfer'
import { useRosterStore } from '../stores/rosters'

const percentage = (probability: number): string => (probability * 100).toFixed(1)
type Notice = Readonly<{ kind: 'success' | 'error'; text: string }>
const signedOptions = [-2, -1, 0, 1, 2] as const
const signedLabel = (value: number): string => value === 0 ? 'None' : value > 0 ? `+${value}` : String(value)
const asOverride = (value: string): ProfileOverride => value === 'profile' || value === 'none' ? value : Number(value) as ProfileOverride

export function SandboxScreen() {
  const rosters = useRosterStore((store) => store.rosters)
  const units = useMemo(() => {
    const unique = new Map<string, UnitProfile>()
    for (const unit of rosters.flatMap(({ units: rosterUnits }) => rosterUnits)) unique.set(unit.id, unit)
    return [...unique.values()]
  }, [rosters])
  const [state, setState] = useState<SandboxState>({
    version: 1,
    attacker: eradicators,
    target: deathshroud,
    weaponId: eradicators.weapons[0]?.id,
    modifiers: defaultSandboxModifiers,
  })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [savedMatchups, setSavedMatchups] = useState<ReadonlyArray<SavedMatchup>>([])
  const attackerWeapon = state.attacker.weapons.find(({ id }) => id === state.weaponId) ?? state.attacker.weapons[0]

  useEffect(() => {
    let active = true
    void sandboxStateFromHash(window.location.hash)
      .then((shared) => {
        if (active && shared !== null) {
          setState(shared)
          setNotice({ kind: 'success', text: 'Shared matchup loaded.' })
        }
      })
      .catch((error: unknown) => {
        if (active) setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'The shared matchup could not be opened.' })
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    void db.savedMatchups.orderBy('updatedAt').reverse().toArray().then(setSavedMatchups)
  }, [])

  const analysed = useMemo(() => {
    try {
      return { kind: 'success' as const, value: analyseSandbox(state) }
    } catch (error: unknown) {
      return { kind: 'failure' as const, message: error instanceof Error ? error.message : 'This matchup cannot be analysed.' }
    }
  }, [state])

  useEffect(() => {
    if (analysed.kind !== 'success') return
    void contentHash({ state, rulesRevision: 'commit-demo-2026-09-13' }).then(async (key) => {
      await cacheAnalysis(key, analysed.value)
      await pruneAnalysisCache()
    })
  }, [analysed, state])

  const selectUnit = (role: 'attacker' | 'target', id: string) => {
    const unit = units.find(({ id: unitId }) => unitId === id)
    if (unit === undefined) return
    setState((current) => role === 'attacker'
      ? { ...current, attacker: unit, weaponId: unit.weapons[0]?.id }
      : { ...current, target: unit })
    setNotice(null)
    setShareLink(null)
  }

  const updateModifier = <Key extends keyof SandboxState['modifiers']>(
    key: Key,
    value: SandboxState['modifiers'][Key],
  ) => {
    setState((current) => ({ ...current, modifiers: { ...current.modifiers, [key]: value } }))
    setShareLink(null)
  }

  const createShareLink = async () => {
    const encoded = await encodeSandboxState(state)
    const url = new URL(window.location.href)
    url.hash = `#/sandbox?s=${encoded}`
    window.history.replaceState(null, '', url)
    setShareLink(url.toString())
    try {
      await navigator.clipboard.writeText(url.toString())
      setNotice({ kind: 'success', text: 'Share link copied.' })
    } catch {
      setNotice({ kind: 'success', text: 'Share link ready. Copy it below.' })
    }
  }

  const importFile = async (file: File | undefined) => {
    if (file === undefined) return
    try {
      if (file.size > 1_000_000) throw new Error('Choose a Commit file smaller than 1 MB.')
      setState(parseMatchupFile(await file.text()))
      setNotice({ kind: 'success', text: 'Matchup imported.' })
      setShareLink(null)
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'The matchup file could not be imported.' })
    }
  }

  const saveOnDevice = async () => {
    const id = `matchup-${(await contentHash(state)).slice(0, 16)}`
    const saved: SavedMatchup = {
      id,
      name: `${state.attacker.name} → ${state.target.name}`,
      state,
      updatedAt: new Date().toISOString(),
    }
    try {
      await db.savedMatchups.put(saved)
      setSavedMatchups((current) => [saved, ...current.filter((matchup) => matchup.id !== id)])
      setNotice({ kind: 'success', text: 'Matchup saved on this device.' })
    } catch {
      setNotice({ kind: 'error', text: 'This matchup could not be saved on this device.' })
    }
  }

  return (
    <>
      <section className="sandbox-hero">
        <p className="eyebrow">Sandbox</p>
        <h1>Test the matchup you actually have.</h1>
        <p>Edit either profile, apply common modifiers, then share the exact setup.</p>
      </section>

      {notice === null ? null : <p className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}

      <section className="sandbox-setup" aria-labelledby="profiles-heading">
        <p className="eyebrow">Profiles</p>
        <h2 id="profiles-heading">Attacker into target</h2>
        <div className="select-grid sandbox-selects">
          <label><span>Attacker</span><select value={state.attacker.id} onChange={(event) => selectUnit('attacker', event.currentTarget.value)}>{units.filter(({ weapons }) => weapons.length > 0).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <label><span>Target</span><select value={state.target.id} onChange={(event) => selectUnit('target', event.currentTarget.value)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <label className="wide"><span>Weapon</span><select value={attackerWeapon?.id ?? ''} onChange={(event) => setState((current) => ({ ...current, weaponId: event.currentTarget.value as NonNullable<SandboxState['weaponId']> }))}>{state.attacker.weapons.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {(weapon.phase ?? 'shoot') === 'shoot' ? 'Shoot' : 'Fight'}</option>)}</select></label>
        </div>
        <details className="profile-disclosure">
          <summary><span>Edit attacker stats</span><small>{attackerWeapon === undefined ? 'Weapon needed' : `${state.attacker.models} models · ${formatDice(attackerWeapon.attacks)} attacks/model · ${attackerWeapon.skill}+ · S${attackerWeapon.strength} · AP ${attackerWeapon.armourPenetration} · Damage ${formatDice(attackerWeapon.damage)}`}</small></summary>
          <UnitEditor unit={state.attacker} index="sandbox-attacker" issues={[]} onChange={(attacker) => setState((current) => ({ ...current, attacker }))} />
        </details>
        <details className="profile-disclosure">
          <summary><span>Edit target stats</span><small>{state.target.models} models · T{state.target.toughness} · {state.target.armourSave}+ save · {state.target.woundsPerModel}W</small></summary>
          <UnitEditor unit={state.target} index="sandbox-target" issues={[]} showWeapon={false} onChange={(target) => setState((current) => ({ ...current, target }))} />
        </details>
      </section>

      <section className="modifier-section" aria-labelledby="modifiers-heading">
        <p className="eyebrow">Modifiers</p>
        <h2 id="modifiers-heading">What applies?</h2>
        <p className="section-help">The exact result updates as you change a field.</p>
        <div className="modifier-grid">
          <label><span>Hit roll</span><select value={state.modifiers.hitModifier} onChange={(event) => updateModifier('hitModifier', Number(event.currentTarget.value))}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
          <label><span>Wound roll</span><select value={state.modifiers.woundModifier} onChange={(event) => updateModifier('woundModifier', Number(event.currentTarget.value))}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
          <label><span>Re-roll hits</span><select value={state.modifiers.rerollHits} onChange={(event) => updateModifier('rerollHits', event.currentTarget.value as SandboxState['modifiers']['rerollHits'])}><option value="profile">Use profile</option><option value="none">None</option><option value="ones">Rolls of 1</option><option value="failed">All failed</option></select></label>
          <label><span>Re-roll wounds</span><select value={state.modifiers.rerollWounds} onChange={(event) => updateModifier('rerollWounds', event.currentTarget.value as SandboxState['modifiers']['rerollWounds'])}><option value="profile">Use profile</option><option value="none">None</option><option value="ones">Rolls of 1</option><option value="failed">All failed</option></select></label>
          <label><span>Damage reduction</span><select value={state.modifiers.damageReduction} onChange={(event) => updateModifier('damageReduction', Number(event.currentTarget.value))}><option value="0">None</option><option value="1">−1 damage, min 1</option><option value="2">−2 damage, min 1</option></select></label>
          <label className="choice-line"><input type="checkbox" checked={state.modifiers.benefitOfCover} onChange={(event) => updateModifier('benefitOfCover', event.currentTarget.checked)} /><span>Target has cover</span></label>
          <label className="choice-line"><input type="checkbox" checked={state.modifiers.lethalHits} onChange={(event) => updateModifier('lethalHits', event.currentTarget.checked)} /><span>Lethal Hits</span></label>
          <label className="choice-line"><input type="checkbox" checked={state.modifiers.devastatingWounds} onChange={(event) => updateModifier('devastatingWounds', event.currentTarget.checked)} /><span>Devastating Wounds</span></label>
          <label><span>Sustained Hits</span><input type="number" min="0" max="3" value={state.modifiers.sustainedHits} onChange={(event) => updateModifier('sustainedHits', Math.max(0, Math.min(3, Number(event.currentTarget.value))))} /></label>
          <label><span>Target Toughness</span><select value={state.modifiers.toughnessModifier} onChange={(event) => updateModifier('toughnessModifier', Number(event.currentTarget.value))}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
          <label><span>Target save roll</span><select value={state.modifiers.saveModifier} onChange={(event) => updateModifier('saveModifier', Number(event.currentTarget.value))}>{signedOptions.map((value) => <option key={value} value={value}>{signedLabel(value)}</option>)}</select></label>
          <label><span>Re-roll saves</span><select value={state.modifiers.rerollSaves} onChange={(event) => updateModifier('rerollSaves', event.currentTarget.value as SandboxState['modifiers']['rerollSaves'])}><option value="none">None</option><option value="ones">Rolls of 1</option><option value="failed">All failed</option></select></label>
          <label><span>Invulnerable save</span><select value={String(state.modifiers.invulnerableSave)} onChange={(event) => updateModifier('invulnerableSave', asOverride(event.currentTarget.value))}><option value="profile">Use profile</option><option value="none">None</option>{[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}+</option>)}</select></label>
          <label><span>Feel No Pain</span><select value={String(state.modifiers.feelNoPain)} onChange={(event) => updateModifier('feelNoPain', asOverride(event.currentTarget.value))}><option value="profile">Use profile</option><option value="none">None</option>{[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}+</option>)}</select></label>
        </div>
      </section>

      {[...new Set([...state.attacker.unsupportedRules, ...state.target.unsupportedRules])].length === 0 ? null : (
        <aside className="notice warning unsupported-sandbox" aria-label="Unsupported rules">
          <strong>Ignored in this calculation</strong>
          <ul>{[...new Set([...state.attacker.unsupportedRules, ...state.target.unsupportedRules])].map((rule) => <li key={rule}>{rule}</li>)}</ul>
          <span>Edit the profile or continue with the listed rules omitted.</span>
        </aside>
      )}

      {analysed.kind === 'failure' ? <p className="notice error" role="alert">{analysed.message}</p> : (
        <section className="sandbox-result" aria-labelledby="sandbox-result-heading">
          <p className="eyebrow">Exact result</p>
          <h2 id="sandbox-result-heading">{state.attacker.name} → {state.target.name}</h2>
          <div className="headline-metrics" aria-live="polite">
            <p><strong className="figure">{percentage(analysed.value.killProbability)}%</strong><span>kill chance, {probabilityWord(analysed.value.killProbability * 100)}</span></p>
            <p><strong className="figure">{analysed.value.expectedDamage.toFixed(1)}</strong><span>expected damage</span></p>
          </div>
          <dl className="threshold-list">
            {analysed.value.thresholds.map(({ label, probability }) => <div key={label}><dt>{label}</dt><dd className="figure">{percentage(probability)}%</dd></div>)}
          </dl>
          <h3>Damage distribution</h3>
          <div className="distribution" role="region" aria-label="Damage probability distribution">
            {analysed.value.damageDistribution.map(([damage, probability]) => (
              <div className="distribution-row" key={damage}>
                <span className="figure">{damage}</span>
                <span className="distribution-track"><span style={{ width: `${Math.max(1, probability * 100)}%` }} /></span>
                <strong className="figure">{percentage(probability)}%</strong>
              </div>
            ))}
          </div>
          <details>
            <summary>Efficiency and rules trace</summary>
            <dl className="threshold-list">
              <div><dt>Damage / 100 points</dt><dd className="figure">{analysed.value.damagePerHundredPoints.toFixed(2)}</dd></div>
              <div><dt>Kill chance / 100 points</dt><dd className="figure">{percentage(analysed.value.killProbabilityPerHundredPoints)}%</dd></div>
            </dl>
            <ul className="trace-list">{analysed.value.rulesTrace.map((line) => <li key={line}>{line}</li>)}</ul>
          </details>
        </section>
      )}

      <section className="share-section" aria-labelledby="share-heading">
        <p className="eyebrow">Keep or share</p>
        <h2 id="share-heading">Take this matchup with you</h2>
        {savedMatchups.length === 0 ? null : (
          <label className="saved-matchups">
            <span>Saved matchups</span>
            <select
              defaultValue=""
              onChange={(event) => {
                const saved = savedMatchups.find(({ id }) => id === event.currentTarget.value)
                if (saved === undefined) return
                setState(saved.state)
                setNotice({ kind: 'success', text: `${saved.name} loaded.` })
                setShareLink(null)
              }}
            >
              <option value="" disabled>Choose a saved matchup…</option>
              {savedMatchups.map((matchup) => <option key={matchup.id} value={matchup.id}>{matchup.name}</option>)}
            </select>
          </label>
        )}
        <div className="share-actions">
          <button className="quiet-action" type="button" onClick={() => void saveOnDevice()}>Save on this device</button>
          <button className="primary-action" type="button" onClick={() => void createShareLink()}>Copy share link</button>
          <button className="quiet-action" type="button" onClick={() => downloadMatchup(state)}>Export .commit.json</button>
          <label className="file-action"><span>Import .commit.json</span><input type="file" accept=".json,.commit.json,application/json" onChange={(event) => void importFile(event.currentTarget.files?.[0])} /></label>
        </div>
        {shareLink === null ? null : <label className="share-link"><span>Share link</span><input readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} /></label>}
      </section>
    </>
  )
}
