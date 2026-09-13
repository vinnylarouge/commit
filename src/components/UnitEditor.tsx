import { useEffect, useState } from 'react'
import { formatDice, parseDice } from '../domain/diceText'
import { weaponId } from '../domain/ids'
import type { UnitProfile, WeaponProfile } from '../domain/profiles'
import type { ParseIssue } from '../import/types'

type Props = Readonly<{
  unit: UnitProfile
  index: string
  issues: ReadonlyArray<ParseIssue>
  onChange: (unit: UnitProfile, field?: string) => void
  onAccept?: () => void
  onRemove?: () => void
  showWeapon?: boolean
}>

const numberValue = (
  value: string,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
): number => Math.min(maximum, Math.max(minimum, Math.floor(Number(value) || 0)))

const defaultWeapon = (unit: UnitProfile): WeaponProfile => ({
  id: weaponId(`${unit.id}-weapon`),
  name: 'New weapon',
  attacks: { kind: 'constant', value: 1 },
  skill: 4,
  strength: 4,
  armourPenetration: 0,
  damage: { kind: 'constant', value: 1 },
  keywords: [],
})

export function UnitEditor({ unit, index, issues, onChange, onAccept, onRemove, showWeapon = true }: Props) {
  const weapon = unit.weapons[0]
  const [attacks, setAttacks] = useState(weapon === undefined ? '1' : formatDice(weapon.attacks))
  const [damage, setDamage] = useState(weapon === undefined ? '1' : formatDice(weapon.damage))

  useEffect(() => {
    setAttacks(weapon === undefined ? '1' : formatDice(weapon.attacks))
    setDamage(weapon === undefined ? '1' : formatDice(weapon.damage))
  }, [unit.id, weapon])

  const updateWeapon = (change: Partial<WeaponProfile>, field: string) => {
    const current = weapon ?? defaultWeapon(unit)
    onChange({ ...unit, weapons: [{ ...current, ...change }, ...unit.weapons.slice(1)] }, field)
  }

  return (
    <fieldset className="unit-editor">
      <legend>{unit.name || 'Untitled unit'}</legend>
      {issues.length === 0 ? null : (
        <div className="field-issues">
          <ul aria-label={`Fields to check for ${unit.name}`}>
            {issues.map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>)}
          </ul>
          {onAccept === undefined ? null : <button type="button" onClick={onAccept}>Values look right</button>}
        </div>
      )}
      <div className="form-grid">
        <label className="wide"><span>Unit name</span><input name={`${index}-unit-name`} autoComplete="off" value={unit.name} onChange={(event) => onChange({ ...unit, name: event.currentTarget.value }, 'name')} /></label>
        <label><span>Points</span><input name={`${index}-points`} autoComplete="off" inputMode="numeric" type="number" min="0" max="10000" value={unit.points} onChange={(event) => onChange({ ...unit, points: numberValue(event.currentTarget.value, 0, 10000) }, 'points')} /></label>
        <label><span>Models</span><input name={`${index}-models`} autoComplete="off" inputMode="numeric" type="number" min="1" max="100" value={unit.models} onChange={(event) => onChange({ ...unit, models: numberValue(event.currentTarget.value, 1, 100) }, 'models')} /></label>
        <label><span>Toughness</span><input name={`${index}-toughness`} autoComplete="off" inputMode="numeric" type="number" min="1" max="100" value={unit.toughness} onChange={(event) => onChange({ ...unit, toughness: numberValue(event.currentTarget.value, 1, 100) }, 'toughness')} /></label>
        <label><span>Save</span><input name={`${index}-save`} autoComplete="off" inputMode="numeric" type="number" min="2" max="7" value={unit.armourSave} onChange={(event) => onChange({ ...unit, armourSave: numberValue(event.currentTarget.value, 2, 7) }, 'armourSave')} /></label>
        <label><span>Wounds/model</span><input name={`${index}-wounds`} autoComplete="off" inputMode="numeric" type="number" min="1" max="100" value={unit.woundsPerModel} onChange={(event) => onChange({ ...unit, woundsPerModel: numberValue(event.currentTarget.value, 1, 100) }, 'woundsPerModel')} /></label>
        <label><span>Invulnerable</span><input name={`${index}-invulnerable`} autoComplete="off" inputMode="numeric" type="number" min="2" max="7" placeholder="None" value={unit.invulnerableSave ?? ''} onChange={(event) => onChange({ ...unit, invulnerableSave: event.currentTarget.value === '' ? null : numberValue(event.currentTarget.value, 2, 7) }, 'invulnerableSave')} /></label>
        <label><span>Feel No Pain</span><input name={`${index}-feel-no-pain`} autoComplete="off" inputMode="numeric" type="number" min="2" max="6" placeholder="None" value={unit.feelNoPain ?? ''} onChange={(event) => onChange({ ...unit, feelNoPain: event.currentTarget.value === '' ? null : numberValue(event.currentTarget.value, 2, 6) }, 'feelNoPain')} /></label>
      </div>

      {!showWeapon ? null : weapon === undefined ? (
        <button className="quiet-action add-weapon" type="button" onClick={() => updateWeapon({}, 'weapons')}>Add attacking weapon</button>
      ) : (
        <div className="weapon-editor">
          <p className="eyebrow">Primary weapon</p>
          <div className="form-grid weapon-grid">
            <label className="wide"><span>Name</span><input name={`${index}-weapon-name`} autoComplete="off" value={weapon.name} onChange={(event) => updateWeapon({ name: event.currentTarget.value }, 'weapons')} /></label>
            <label><span>Attacks</span><input name={`${index}-attacks`} autoComplete="off" value={attacks} aria-invalid={parseDice(attacks) === null} onChange={(event) => {
              const next = event.currentTarget.value
              setAttacks(next)
              const parsed = parseDice(next)
              if (parsed !== null) updateWeapon({ attacks: parsed }, 'attacks')
            }} /></label>
            <label><span>BS/WS</span><input name={`${index}-skill`} autoComplete="off" inputMode="numeric" type="number" min="2" max="6" value={weapon.skill} onChange={(event) => updateWeapon({ skill: numberValue(event.currentTarget.value, 2, 6) }, 'skill')} /></label>
            <label><span>Strength</span><input name={`${index}-strength`} autoComplete="off" inputMode="numeric" type="number" min="1" max="100" value={weapon.strength} onChange={(event) => updateWeapon({ strength: numberValue(event.currentTarget.value, 1, 100) }, 'strength')} /></label>
            <label><span>AP</span><input name={`${index}-ap`} autoComplete="off" inputMode="numeric" type="number" min="-6" max="0" value={weapon.armourPenetration} onChange={(event) => updateWeapon({ armourPenetration: numberValue(event.currentTarget.value, -6, 0) }, 'armourPenetration')} /></label>
            <label><span>Damage</span><input name={`${index}-damage`} autoComplete="off" value={damage} aria-invalid={parseDice(damage) === null} onChange={(event) => {
              const next = event.currentTarget.value
              setDamage(next)
              const parsed = parseDice(next)
              if (parsed !== null) updateWeapon({ damage: parsed }, 'damage')
            }} /></label>
          </div>
        </div>
      )}
      {onRemove === undefined ? null : <button className="danger-action" type="button" onClick={onRemove}>Remove unit</button>}
    </fieldset>
  )
}
