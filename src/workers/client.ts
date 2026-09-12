import type { AnalysisRequest, AnalysisResponse, CommitmentAnalysis } from './protocol'

type PendingRequest = Readonly<{
  resolve: (analysis: CommitmentAnalysis) => void
  reject: (error: Error) => void
  onProgress?: (completed: number, total: number) => void
}>

let worker: Worker | null = null
let sequence = 0
const pending = new Map<string, PendingRequest>()

const getWorker = (): Worker => {
  if (worker !== null) return worker
  worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<AnalysisResponse>) => {
    const response = event.data
    const request = pending.get(response.id)
    if (request === undefined) return
    if (response.kind === 'progress') {
      request.onProgress?.(response.completed, response.total)
      return
    }
    pending.delete(response.id)
    if (response.kind === 'success') request.resolve(response.analysis)
    else request.reject(new Error(response.message))
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Analysis worker failed')
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  }
  return worker
}

export const analyseCommitment = (
  request: Omit<AnalysisRequest, 'id'>,
  onProgress?: (completed: number, total: number) => void,
): Promise<CommitmentAnalysis> => {
  sequence += 1
  const id = `analysis-${sequence}`
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress })
    getWorker().postMessage({ ...request, id } satisfies AnalysisRequest)
  })
}
