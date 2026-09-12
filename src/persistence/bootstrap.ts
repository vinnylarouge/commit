import { demoBundle, demoRosters } from '../domain/demoData'
import { db } from './db'

export const ensureDemoData = async (): Promise<void> => {
  await db.transaction('rw', db.rosters, db.meta, async () => {
    for (const roster of demoRosters) {
      if (await db.rosters.get(roster.id) === undefined) {
        await db.rosters.put(roster)
      }
    }
    await db.meta.put({ key: 'schemaVersion', value: demoBundle.schemaVersion })
    await db.meta.put({ key: 'rulesRevision', value: demoBundle.rulesRevision })
  })
}
