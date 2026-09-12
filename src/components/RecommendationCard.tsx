import { useLayoutEffect, useRef } from 'react'
import { probabilityWord } from '../domain/probability'
import type { Recommendation } from '../engine/verticalSlice'

type Props = Readonly<{ recommendation: Recommendation }>

export function RecommendationCard({ recommendation }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)

  // A new answer lands below the fold on a phone: bring it on screen and hand focus to it so
  // assistive tech announces it. Smoothness comes from CSS scroll-behavior, so reduced motion holds.
  // Remount with a key to replay the arrival animation when a replan lands.
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.closest('section')?.scrollIntoView({ block: 'start' })
  }, [recommendation])

  // Number first, house-scale word second, always both (docs/probability-words.md).
  return (
    <section className="result">
      <p className="eyebrow">Recommended plan</p>
      <h1 ref={heading} tabIndex={-1}>{recommendation.first} first</h1>
      <p className="probability">
        <strong className="figure">{recommendation.firstKillChance}%</strong> kill chance, {probabilityWord(recommendation.firstKillChance)}
      </p>
      <div className="continuation">
        <span>If they survive</span>
        <strong>→ {recommendation.continuation}</strong>
        <strong className="figure">→ {recommendation.totalKillChance}% total, {probabilityWord(recommendation.totalKillChance)}</strong>
      </div>
      <p className="resource-advice">{recommendation.resourceAdvice}</p>
      <button className="secondary-action" type="button">Resolve attack</button>
      <details>
        <summary>Details</summary>
        <p>Hard-coded Milestone 0 example. Exact combat arithmetic arrives in Milestone 1.</p>
      </details>
    </section>
  )
}
