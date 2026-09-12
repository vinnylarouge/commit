import { useSyncExternalStore } from 'react'

export type Route = 'prep' | 'game' | 'sandbox'

const routeFromHash = (): Route => {
  const segment = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return segment === 'prep' || segment === 'sandbox' ? segment : 'game'
}

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

export const useRoute = (): Route => useSyncExternalStore(subscribe, routeFromHash)
