import { useEffect, useLayoutEffect } from 'react'
import { GameScreen } from './GameScreen'
import { useRoute } from './router'
import { useGameStore } from '../stores/game'
import { applyTheme, setPreference, usePreferences, type Theme } from '../stores/preferences'

const themeOptions: ReadonlyArray<Readonly<{ value: Theme; label: string }>> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function App() {
  const route = useRoute()
  const { theme } = usePreferences()
  const hydrate = useGameStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useLayoutEffect(() => {
    applyTheme(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const reapply = () => applyTheme(theme)
    media.addEventListener('change', reapply)
    return () => media.removeEventListener('change', reapply)
  }, [theme])

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

      {route === 'game' ? <GameScreen /> : route === 'prep' ? (
        <section className="route-placeholder">
          <p className="eyebrow">Prep</p>
          <h1>Know the matchup before the first roll.</h1>
          <p>Roster import and matchup analysis arrive in the next deployment.</p>
        </section>
      ) : (
        <section className="route-placeholder">
          <p className="eyebrow">Sandbox</p>
          <h1>Test any matchup.</h1>
          <p>Detailed profile controls arrive in the final deployment.</p>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <a className={route === 'prep' ? 'active' : undefined} href="#/prep" aria-current={route === 'prep' ? 'page' : undefined}>Prep</a>
        <a className={route === 'game' ? 'active' : undefined} href="#/game" aria-current={route === 'game' ? 'page' : undefined}>Game</a>
        <a className={route === 'sandbox' ? 'active' : undefined} href="#/sandbox" aria-current={route === 'sandbox' ? 'page' : undefined}>Sandbox</a>
      </nav>
    </main>
  )
}
