import { useLayoutEffect, useRef } from 'react'
import type { RecommendationView } from '../domain/plans'

type Props = Readonly<{
  recommendation: RecommendationView
  onResolve?: () => void
}>

export function RecommendationCard({ recommendation, onResolve }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.closest('section')?.scrollIntoView({ block: 'start' })
  }, [recommendation])

  return (
    <section className={recommendation.kind === 'impossible' ? 'result impossible' : 'result'}>
      <p className="eyebrow">{recommendation.kind === 'impossible' ? 'Best available' : 'Recommended plan'}</p>
      <h1 ref={heading} tabIndex={-1}>{recommendation.headline}</h1>
      <p className="probability">
        <strong className="figure">{recommendation.headlineProbability}%</strong>
        {' '}kill chance, {recommendation.headlineWord}
      </p>
      {recommendation.continuation === null ? null : (
        <div className="continuation">
          <span>If the target survives</span>
          <strong>→ {recommendation.continuation}</strong>
          <strong className="figure">→ {recommendation.totalProbability}% total, {recommendation.totalWord}</strong>
        </div>
      )}
      <p className="resource-advice">{recommendation.resourceAdvice}</p>
      <p className="result-reason">{recommendation.reason}</p>
      {onResolve === undefined ? null : (
        <button className="secondary-action" type="button" onClick={onResolve}>Resolve attack</button>
      )}
      <details>
        <summary>Details</summary>
        <dl className="metric-list">
          <div><dt>Goal</dt><dd className="figure">Kill at ≥ {recommendation.requiredConfidence}%</dd></div>
          <div><dt>Total success</dt><dd className="figure">{recommendation.totalProbability}%</dd></div>
          <div><dt>Expected activations</dt><dd className="figure">{recommendation.expectedActivations.toFixed(2)}</dd></div>
          <div><dt>Expected CP</dt><dd className="figure">{recommendation.expectedCommandPoints.toFixed(2)}</dd></div>
          <div><dt>Method</dt><dd>{recommendation.analysisMethod}</dd></div>
        </dl>
        {recommendation.unsupportedRules.length === 0 ? null : (
          <div className="unsupported notice warning">
            <strong>Ignored in this calculation</strong>
            <ul>{recommendation.unsupportedRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          </div>
        )}
        <h2>Assumptions and rules trace</h2>
        <ul className="trace-list">
          {recommendation.rulesTrace.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <h2>Alternative plans</h2>
        <ul className="alternative-list">
          {recommendation.alternatives.map((alternative) => (
            <li key={`${alternative.name}-${alternative.probability}`}>
              <span>{alternative.name}</span>
              <strong className="figure">{alternative.probability}%</strong>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
