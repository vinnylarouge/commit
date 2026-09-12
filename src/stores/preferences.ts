import { useSyncExternalStore } from 'react'
import type { Confidence } from '../domain/probability'

export type Theme = 'system' | 'light' | 'dark'
export type Preferences = Readonly<{ theme: Theme; confidence: Confidence }>

const STORAGE_KEY = 'commit.preferences'
const themes: ReadonlyArray<Theme> = ['system', 'light', 'dark']
const confidences: ReadonlyArray<Confidence> = [60, 80, 95]
const defaults: Preferences = { theme: 'system', confidence: 80 }

// Storage is same-origin but may hold an older shape; anything unrecognised falls back per field.
const load = (): Preferences => {
  let stored: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof parsed === 'object' && parsed !== null) stored = parsed as Record<string, unknown>
  } catch {
    // Unreadable storage: defaults.
  }
  return {
    theme: themes.find((theme) => theme === stored.theme) ?? defaults.theme,
    confidence: confidences.find((value) => value === stored.confidence) ?? defaults.confidence,
  }
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

export const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
  current = { ...current, [key]: value }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage refused (quota, restricted webview): the choice still holds for this session.
  }
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
