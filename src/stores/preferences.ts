import { useSyncExternalStore } from 'react'
import type { Confidence } from '../domain/probability'
import { db } from '../persistence/db'

export type Theme = 'system' | 'light' | 'dark'
export type DetailPreference = 'simple' | 'detailed'
export type Preferences = Readonly<{ theme: Theme; confidence: Confidence; detail: DetailPreference }>

const STORAGE_KEY = 'commit.preferences'
const themes: ReadonlyArray<Theme> = ['system', 'light', 'dark']
const confidences: ReadonlyArray<Confidence> = [60, 80, 95]
const details: ReadonlyArray<DetailPreference> = ['simple', 'detailed']
const defaults: Preferences = { theme: 'system', confidence: 80, detail: 'simple' }

const validated = (stored: Record<string, unknown>): Preferences => ({
  theme: themes.find((theme) => theme === stored.theme) ?? defaults.theme,
  confidence: confidences.find((value) => value === stored.confidence) ?? defaults.confidence,
  detail: details.find((value) => value === stored.detail) ?? defaults.detail,
})

// Storage is same-origin but may hold an older shape; anything unrecognised falls back per field.
const load = (): Preferences => {
  let stored: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof parsed === 'object' && parsed !== null) stored = parsed as Record<string, unknown>
  } catch {
    // Unreadable storage: defaults.
  }
  return validated(stored)
}

let current = load()
const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const usePreferences = (): Preferences => useSyncExternalStore(subscribe, () => current)

export const hydratePreferences = async (): Promise<void> => {
  try {
    const stored = await db.preferences.get('ui')
    if (typeof stored?.value !== 'object' || stored.value === null) {
      await db.preferences.put({ key: 'ui', value: current })
      return
    }
    current = validated(stored.value as Record<string, unknown>)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    listeners.forEach((listener) => listener())
  } catch {
    // The localStorage copy remains usable when IndexedDB is restricted.
  }
}

export const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
  current = { ...current, [key]: value }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage refused (quota, restricted webview): the choice still holds for this session.
  }
  void db.preferences.put({ key: 'ui', value: current }).catch(() => undefined)
  listeners.forEach((listener) => listener())
}

// One attribute on <html>; tokens.css resolves light-dark() from it. 'system' removes the override.
// The browser toolbar colour follows whatever the page background resolved to.
export const applyTheme = (theme: Theme): void => {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', getComputedStyle(document.body).backgroundColor)
}
