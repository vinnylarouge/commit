import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Node 25 defines a non-functional localStorage global that the jsdom environment does not replace.
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, String(value))
  },
  clear: () => memory.clear(),
})

const loadStore = async () => {
  vi.resetModules()
  return import('./preferences')
}

describe('preferences store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each(['{"theme":"sepia","confidence":42}', 'not json', '[]'])(
    'falls back to defaults for unusable storage %s',
    async (raw) => {
      localStorage.setItem('commit.preferences', raw)
      const { usePreferences } = await loadStore()
      expect(renderHook(usePreferences).result.current).toEqual({ theme: 'system', confidence: 80 })
    },
  )

  it('persists a change and serves it after reload', async () => {
    const first = await loadStore()
    const { result } = renderHook(first.usePreferences)
    act(() => first.setPreference('theme', 'dark'))
    expect(result.current.theme).toBe('dark')

    const second = await loadStore()
    expect(renderHook(second.usePreferences).result.current).toEqual({ theme: 'dark', confidence: 80 })
  })

  it('applies the theme as one html attribute and clears it for system', async () => {
    const { applyTheme } = await loadStore()
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
