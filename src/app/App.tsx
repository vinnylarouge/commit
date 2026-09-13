import { useEffect, useLayoutEffect } from 'react'
import { GameScreen } from './GameScreen'
import { PrepScreen } from './PrepScreen'
import { SandboxScreen } from './SandboxScreen'
import { useRoute } from './router'
import { useGameStore } from '../stores/game'
import { applyTheme, hydratePreferences, setPreference, usePreferences, type Theme } from '../stores/preferences'
import { useRosterStore } from '../stores/rosters'

const themeOptions: ReadonlyArray<Readonly<{ value: Theme; label: string }>> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function App() {
  const route = useRoute()
  const { theme, detail } = usePreferences()
  const hydrate = useGameStore((state) => state.hydrate)
  const hydrateRosters = useRosterStore((state) => state.hydrate)

  useEffect(() => {
    void Promise.all([hydrate(), hydrateRosters(), hydratePreferences()])
  }, [hydrate, hydrateRosters])

  useLayoutEffect(() => {
    applyTheme(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const reapply = () => applyTheme(theme)
    media.addEventListener('change', reapply)
    return () => media.removeEventListener('change', reapply)
  }, [theme])

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <a className="wordmark" href="#/game" aria-label="Commit home" translate="no">COMMIT</a>
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
        <fieldset className="field-group settings-group">
          <legend className="eyebrow">Answer detail</legend>
          <label className="choice-line"><input type="radio" name="detail" checked={detail === 'simple'} onChange={() => setPreference('detail', 'simple')} /><span>Simple first</span></label>
          <label className="choice-line"><input type="radio" name="detail" checked={detail === 'detailed'} onChange={() => setPreference('detail', 'detailed')} /><span>Keep details open</span></label>
        </fieldset>
      </div>

      <div id="main-content" tabIndex={-1}>
        {route === 'game' ? <GameScreen /> : route === 'prep' ? <PrepScreen /> : <SandboxScreen />}
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <a className={route === 'prep' ? 'active' : undefined} href="#/prep" aria-current={route === 'prep' ? 'page' : undefined}>Prep</a>
        <a className={route === 'game' ? 'active' : undefined} href="#/game" aria-current={route === 'game' ? 'page' : undefined}>Game</a>
        <a className={route === 'sandbox' ? 'active' : undefined} href="#/sandbox" aria-current={route === 'sandbox' ? 'page' : undefined}>Sandbox</a>
      </nav>
    </main>
  )
}
