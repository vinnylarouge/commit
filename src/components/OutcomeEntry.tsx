import { useState } from 'react'
import { outcomeOptions } from '../domain/outcome'
import type { UnitProfile } from '../domain/profiles'

type Props = Readonly<{
  target: UnitProfile
  currentWounds: number
  onCancel: () => void
  onContinue: (woundsRemaining: number) => void
}>

export function OutcomeEntry({ target, currentWounds, onCancel, onContinue }: Props) {
  const [woundsRemaining, setWoundsRemaining] = useState(currentWounds)

  return (
    <section className="outcome-entry" aria-labelledby="outcome-heading">
      <p className="eyebrow">Resolve attack</p>
      <h2 id="outcome-heading">What happened?</h2>
      <div className="outcome-grid" aria-label="Quick outcomes">
        {outcomeOptions(target, currentWounds).map((option) => (
          <button
            className={woundsRemaining === option.woundsRemaining ? 'outcome-option selected' : 'outcome-option'}
            type="button"
            key={`${option.label}-${option.woundsRemaining}`}
            onClick={() => setWoundsRemaining(option.woundsRemaining)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="number-field">
        <span>Exact wounds remaining</span>
        <input
          className="figure"
          type="number"
          min="0"
          max={target.models * target.woundsPerModel}
          value={woundsRemaining}
          onChange={(event) => setWoundsRemaining(Math.max(0, Math.min(
            target.models * target.woundsPerModel,
            Number(event.currentTarget.value),
          )))}
        />
      </label>
      <div className="button-row">
        <button className="quiet-action" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-action" type="button" onClick={() => onContinue(woundsRemaining)}>
          Continue
        </button>
      </div>
    </section>
  )
}
