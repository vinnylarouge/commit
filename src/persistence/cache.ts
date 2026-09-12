import { db } from './db'

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const object = value as Record<string, unknown>
  const fields = Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
  return `{${fields.join(',')}}`
}

export const contentHash = async (value: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(stableStringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const cacheAnalysis = async (key: string, payload: unknown): Promise<void> => {
  await db.savedAnalyses.put({ key, payload, createdAt: new Date().toISOString() })
}

export const getCachedAnalysis = async (key: string): Promise<unknown | undefined> =>
  (await db.savedAnalyses.get(key))?.payload

export const pruneAnalysisCache = async (keep = 40): Promise<void> => {
  const staleKeys = await db.savedAnalyses.orderBy('createdAt').reverse().offset(keep).primaryKeys()
  await db.savedAnalyses.bulkDelete(staleKeys)
}
