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
  onAccept: () => void
  onRemove: () => void
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

export function UnitEditor({ unit, issues, onChange, onAccept, onRemove }: Props) {
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
          <button type="button" onClick={onAccept}>Values look right</button>
        </div>
      )}
      <div className="form-grid">
        <label className="wide"><span>Unit name</span><input value={unit.name} onChange={(event) => onChange({ ...unit, name: event.currentTarget.value }, 'name')} /></label>
        <label><span>Points</span><input type="number" min="0" value={unit.points} onChange={(event) => onChange({ ...unit, points: numberValue(event.currentTarget.value, 0) }, 'points')} /></label>
        <label><span>Models</span><input type="number" min="1" value={unit.models} onChange={(event) => onChange({ ...unit, models: numberValue(event.currentTarget.value, 1) }, 'models')} /></label>
        <label><span>Toughness</span><input type="number" min="1" value={unit.toughness} onChange={(event) => onChange({ ...unit, toughness: numberValue(event.currentTarget.value, 1) }, 'toughness')} /></label>
        <label><span>Save</span><input type="number" min="2" max="7" value={unit.armourSave} onChange={(event) => onChange({ ...unit, armourSave: numberValue(event.currentTarget.value, 2, 7) }, 'armourSave')} /></label>
        <label><span>Wounds/model</span><input type="number" min="1" value={unit.woundsPerModel} onChange={(event) => onChange({ ...unit, woundsPerModel: numberValue(event.currentTarget.value, 1) }, 'woundsPerModel')} /></label>
        <label><span>Invulnerable</span><input type="number" min="2" max="7" placeholder="None" value={unit.invulnerableSave ?? ''} onChange={(event) => onChange({ ...unit, invulnerableSave: event.currentTarget.value === '' ? null : numberValue(event.currentTarget.value, 2, 7) }, 'invulnerableSave')} /></label>
      </div>

      {weapon === undefined ? (
        <button className="quiet-action add-weapon" type="button" onClick={() => updateWeapon({}, 'weapons')}>Add attacking weapon</button>
      ) : (
        <div className="weapon-editor">
          <p className="eyebrow">Primary weapon</p>
          <div className="form-grid weapon-grid">
            <label className="wide"><span>Name</span><input value={weapon.name} onChange={(event) => updateWeapon({ name: event.currentTarget.value }, 'weapons')} /></label>
            <label><span>Attacks</span><input value={attacks} aria-invalid={parseDice(attacks) === null} onChange={(event) => {
              const next = event.currentTarget.value
              setAttacks(next)
              const parsed = parseDice(next)
              if (parsed !== null) updateWeapon({ attacks: parsed }, 'attacks')
            }} /></label>
            <label><span>BS/WS</span><input type="number" min="2" max="6" value={weapon.skill} onChange={(event) => updateWeapon({ skill: numberValue(event.currentTarget.value, 2, 6) }, 'skill')} /></label>
            <label><span>Strength</span><input type="number" min="1" value={weapon.strength} onChange={(event) => updateWeapon({ strength: numberValue(event.currentTarget.value, 1) }, 'strength')} /></label>
            <label><span>AP</span><input type="number" min="-6" max="0" value={weapon.armourPenetration} onChange={(event) => updateWeapon({ armourPenetration: numberValue(event.currentTarget.value, -6, 0) }, 'armourPenetration')} /></label>
            <label><span>Damage</span><input value={damage} aria-invalid={parseDice(damage) === null} onChange={(event) => {
              const next = event.currentTarget.value
              setDamage(next)
              const parsed = parseDice(next)
              if (parsed !== null) updateWeapon({ damage: parsed }, 'damage')
            }} /></label>
          </div>
        </div>
      )}
      <button className="danger-action" type="button" onClick={onRemove}>Remove unit</button>
    </fieldset>
  )
}
