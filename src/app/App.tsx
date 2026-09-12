import { useState } from 'react'
import {
  confidencePresets,
  probabilityWord,
  type Confidence,
} from '../domain/probability'
import {
  getVerticalSliceRecommendation,
  type Recommendation,
} from '../engine/verticalSlice'

const attackers = ['Eradicators', 'Ballistus', 'Hellblasters'] as const

export function App() {
  const [confidence, setConfidence] = useState<Confidence>(80)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)

  const calculate = () => {
    window.location.hash = '/game'
    setRecommendation(getVerticalSliceRecommendation(confidence))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#/game" aria-label="Commit home">COMMIT</a>
        <button className="menu-button" type="button" aria-label="More options">•••</button>
      </header>

      <section className="brief" aria-label="Commitment setup">
        <div className="field-group">
          <p className="eyebrow">Target</p>
          <div className="target-card">
            <strong>Deathshroud Terminators</strong>
            <span>3 models · 9 wounds</span>
          </div>
        </div>

        <fieldset className="field-group">
          <legend className="eyebrow">Goal</legend>
          <label className="choice-line">
            <input type="radio" name="goal" defaultChecked />
            <span>Kill unit</span>
          </label>
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Confidence</legend>
          <div className="confidence-grid">
            {confidencePresets.map((option) => (
              <label className="confidence-choice" key={option.value}>
                <input
                  type="radio"
                  name="confidence"
                  checked={confidence === option.value}
                  onChange={() => setConfidence(option.value)}
                />
                <span>{option.label}</span>
                <strong>{option.value}%, {probabilityWord(option.value)}</strong>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Available</legend>
          <div className="attacker-list">
            {attackers.map((attacker) => (
              <label className="choice-line" key={attacker}>
                <input type="checkbox" defaultChecked />
                <span>{attacker}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button className="primary-action" type="button" onClick={calculate}>
          Find best commitment
        </button>
      </section>

      {recommendation === null ? null : (
        <section className="result" aria-live="polite">
          <p className="eyebrow">Recommended plan</p>
          <h1>{recommendation.first} first</h1>
          <p className="probability">
            <strong>{recommendation.firstKillChance}%, {probabilityWord(recommendation.firstKillChance)}</strong>
            {' '}kill chance
          </p>
          <div className="continuation">
            <span>If they survive</span>
            <strong>→ {recommendation.continuation}</strong>
            <strong>→ {recommendation.totalKillChance}% total</strong>
          </div>
          <p className="resource-advice">{recommendation.resourceAdvice}</p>
          <button className="secondary-action" type="button">Resolve attack</button>
          <details>
            <summary>Details</summary>
            <p>Hard-coded Milestone 0 example. Exact combat arithmetic arrives in Milestone 1.</p>
          </details>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <a href="#/prep">Prep</a>
        <a className="active" href="#/game" aria-current="page">Game</a>
        <a href="#/sandbox">Sandbox</a>
      </nav>
    </main>
  )
}
