import { beforeEach, describe, expect, it } from 'vitest'
import { cacheAnalysis, contentHash, getCachedAnalysis, pruneAnalysisCache } from './cache'
import { db } from './db'

describe('content-addressed analysis cache', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('hashes object content independent of key order', async () => {
    expect(await contentHash({ attacker: 'A', target: 'B' }))
      .toBe(await contentHash({ target: 'B', attacker: 'A' }))
  })

  it('stores by hash and prunes older analyses', async () => {
    await cacheAnalysis('old', { result: 1 })
    await new Promise((resolve) => setTimeout(resolve, 2))
    await cacheAnalysis('new', { result: 2 })
    await pruneAnalysisCache(1)
    expect(await getCachedAnalysis('old')).toBeUndefined()
    expect(await getCachedAnalysis('new')).toEqual({ result: 2 })
  })
})
