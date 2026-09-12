/// <reference lib="webworker" />

import type { AnalysisRequest, AnalysisResponse } from './protocol'
import { runAnalysis } from './runAnalysis'

const post = (response: AnalysisResponse) => self.postMessage(response)

self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const request = event.data
  try {
    const analysis = runAnalysis(request, (completed, total) => {
      post({ id: request.id, kind: 'progress', completed, total })
    })
    post({ id: request.id, kind: 'success', analysis })
  } catch (error: unknown) {
    post({
      id: request.id,
      kind: 'failure',
      message: error instanceof Error ? error.message : 'Analysis failed',
    })
  }
}
