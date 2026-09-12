import { useLayoutEffect, useState } from 'react'
import { RecommendationCard } from '../components/RecommendationCard'
import { confidencePresets, probabilityWord } from '../domain/probability'
import { getVerticalSliceRecommendation, type Recommendation } from '../engine/verticalSlice'
import { applyTheme, setPreference, usePreferences, type Theme } from '../stores/preferences'

const attackers = ['Eradicators', 'Ballistus', 'Hellblasters'] as const
const themeOptions: ReadonlyArray<Readonly<{ value: Theme; label: string }>> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function App() {
  const { theme, confidence } = usePreferences()
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)

  // Re-apply on OS scheme changes too, so the browser toolbar colour keeps matching the page.
  useLayoutEffect(() => {
    applyTheme(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const reapply = () => applyTheme(theme)
    media.addEventListener('change', reapply)
    return () => media.removeEventListener('change', reapply)
  }, [theme])

  const calculate = () => {
    window.location.hash = '/game'
    setRecommendation(getVerticalSliceRecommendation(confidence))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#/game" aria-label="Commit home">COMMIT</a>
        <button className="menu-button" type="button" popoverTarget="settings" aria-label="Settings">•••</button>
      </header>

      <div id="settings" className="sheet" popover="auto">
        <fieldset className="field-group">
          <legend className="eyebrow">Appearance</legend>
          {themeOptions.map((option) => (
            <label className="choice-line" key={option.value}>
              <input
                type="radio"
                name="theme"
                checked={theme === option.value}
                onChange={() => setPreference('theme', option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

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
          {confidencePresets.map((option) => (
            <label className="choice-line" key={option.value}>
              <input
                type="radio"
                name="confidence"
                checked={confidence === option.value}
                onChange={() => setPreference('confidence', option.value)}
              />
              <span>{option.label}</span>
              <strong className="figure">{option.value}%, {probabilityWord(option.value)}</strong>
            </label>
          ))}
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

      {recommendation === null ? null : <RecommendationCard recommendation={recommendation} />}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <a href="#/prep">Prep</a>
        <a className="active" href="#/game" aria-current="page">Game</a>
        <a href="#/sandbox">Sandbox</a>
      </nav>
    </main>
  )
}
