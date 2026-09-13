import { useState } from 'react'
import { OutcomeEntry } from '../components/OutcomeEntry'
import { RecommendationCard } from '../components/RecommendationCard'
import { demoMyRoster, demoOpponentRoster } from '../domain/demoData'
import type { GameSession } from '../domain/combatState'
import type { UnitId } from '../domain/ids'
import { presentCommitment, type RecommendationView } from '../domain/plans'
import { targetProfile } from '../domain/profiles'
import { confidencePresets, probabilityWord } from '../domain/probability'
import { useGameStore } from '../stores/game'
import { setPreference, usePreferences } from '../stores/preferences'
import { useRosterStore } from '../stores/rosters'
import { analyseCommitment } from '../workers/client'

const gamePhases = ['command', 'movement', 'shooting', 'charge', 'fight'] as const

type AnalysisState =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'pending'; completed: number; total: number }>
  | Readonly<{ kind: 'success'; recommendation: RecommendationView }>
  | Readonly<{ kind: 'failure'; message: string }>

export function GameScreen() {
  const { confidence } = usePreferences()
  const session = useGameStore((state) => state.session)
  const persistenceError = useGameStore((state) => state.persistenceError)
  const selectTarget = useGameStore((state) => state.selectTarget)
  const toggleAttacker = useGameStore((state) => state.toggleAttacker)
  const resolveAttack = useGameStore((state) => state.resolveAttack)
  const setCommandPoints = useGameStore((state) => state.setCommandPoints)
  const setGoal = useGameStore((state) => state.setGoal)
  const setPhase = useGameStore((state) => state.setPhase)
  const nextTurn = useGameStore((state) => state.nextTurn)
  const [analysis, setAnalysis] = useState<AnalysisState>({ kind: 'idle' })
  const [resolving, setResolving] = useState(false)

  const rosters = useRosterStore((state) => state.rosters)
  const myRoster = rosters.find(({ id }) => id === session.myRosterId) ?? demoMyRoster
  const opponentRoster = rosters.find(({ id }) => id === session.opponentRosterId) ?? demoOpponentRoster
  const target = opponentRoster.units.find(({ id }) => id === session.selectedTargetId)
  if (target === undefined) return <p role="alert">The selected target is missing from this roster.</p>
  const targetWounds = session.units[target.id]?.woundsRemaining ?? target.models * target.woundsPerModel
  const availableAttackers = myRoster.units.filter(({ id }) => !session.units[id]?.hasActivated)

  const calculate = async (game: GameSession = session) => {
    const selectedTarget = opponentRoster.units.find(({ id }) => id === game.selectedTargetId)
    if (selectedTarget === undefined) {
      setAnalysis({ kind: 'failure', message: 'The selected target is no longer available.' })
      return
    }
    const wounds = game.units[selectedTarget.id]?.woundsRemaining
      ?? selectedTarget.models * selectedTarget.woundsPerModel
    const goalWoundsRemaining = game.goal.kind === 'kill'
      ? 0
      : game.goal.kind === 'remove-models'
        ? Math.max(0, wounds - game.goal.count * selectedTarget.woundsPerModel)
        : Math.max(0, wounds - game.goal.amount)
    const goalLabel = game.goal.kind === 'kill'
      ? 'Kill unit'
      : game.goal.kind === 'remove-models'
        ? `Remove ≥ ${game.goal.count} models`
        : `Deal ≥ ${game.goal.amount} wounds`
    setResolving(false)
    setAnalysis({ kind: 'pending', completed: 0, total: game.selectedAttackerIds.length })
    try {
      const result = await analyseCommitment({
        kind: 'optimise-commitment',
        target: targetProfile(selectedTarget),
        targetWoundsRemaining: wounds,
        attackers: myRoster.units,
        selectedAttackerIds: game.selectedAttackerIds,
        requiredConfidence: confidence / 100,
        commandPoints: game.commandPoints,
        goalWoundsRemaining,
        goalLabel,
        targetUnsupportedRules: selectedTarget.unsupportedRules,
      }, (completed, total) => setAnalysis({ kind: 'pending', completed, total }))
      setAnalysis({ kind: 'success', recommendation: presentCommitment(result) })
    } catch (error: unknown) {
      setAnalysis({
        kind: 'failure',
        message: error instanceof Error ? error.message : 'The analysis could not be completed.',
      })
    }
  }

  const continueAfterOutcome = (woundsRemaining: number) => {
    if (analysis.kind !== 'success' || analysis.recommendation.firstActionId === null) return
    resolveAttack(analysis.recommendation.firstActionId as UnitId, target.id, woundsRemaining)
    void calculate(useGameStore.getState().session)
  }

  return (
    <>
      <h1 className="sr-only">Current game</h1>
      <section className="session-strip" aria-label="Current game">
        <span>Turn <strong className="figure">{session.turn}</strong></span>
        <select className="phase-pill" aria-label="Phase" value={session.phase} onChange={(event) => setPhase(event.currentTarget.value as GameSession['phase'])}>
          {gamePhases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
        </select>
        <label className="cp-control">
          <span>CP</span>
          <input
            className="figure"
            type="number"
            min="0"
            max="20"
            value={session.commandPoints}
            onChange={(event) => setCommandPoints(Number(event.currentTarget.value))}
          />
        </label>
        <button className="text-action" type="button" onClick={nextTurn}>Next turn</button>
      </section>

      {persistenceError === null ? null : (
        <p className="notice warning" role="status">Game changes remain available now, but local saving failed: {persistenceError}</p>
      )}

      <section className="brief" aria-label="Commitment setup">
        <fieldset className="field-group">
          <legend className="eyebrow">Target</legend>
          <div className="target-list">
            {opponentRoster.units.map((unit) => {
              const wounds = session.units[unit.id]?.woundsRemaining ?? unit.models * unit.woundsPerModel
              return (
                <label className="target-card selectable" key={unit.id}>
                  <input
                    type="radio"
                    name="target"
                    checked={target.id === unit.id}
                    onChange={() => {
                      selectTarget(unit.id)
                      setAnalysis({ kind: 'idle' })
                    }}
                  />
                  <span className="target-copy">
                    <strong>{unit.name}</strong>
                    <span className="figure">{wounds} wounds remaining</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Goal</legend>
          <label className="choice-line">
            <input type="radio" name="goal" checked={session.goal.kind === 'kill'} onChange={() => setGoal({ kind: 'kill' })} />
            <span>Kill unit</span>
          </label>
          <label className="choice-line">
            <input type="radio" name="goal" checked={session.goal.kind === 'remove-models'} disabled={target.models < 2} onChange={() => setGoal({ kind: 'remove-models', count: Math.min(2, target.models) })} />
            <span>Remove ≥ 2 models</span>
          </label>
          <label className="choice-line">
            <input type="radio" name="goal" checked={session.goal.kind === 'deal-damage'} onChange={() => setGoal({ kind: 'deal-damage', amount: Math.min(6, targetWounds) })} />
            <span>Deal ≥ {Math.min(6, targetWounds)} wounds</span>
          </label>
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Confidence</legend>
          {confidencePresets.map((option) => (
            <label className="choice-line" key={option.value}>
              <input
                type="radio"
                name="confidence"
                checked={confidence === option.value}
                onChange={() => setPreference('confidence', option.value)}
              />
              <span>{option.label}</span>
              <strong className="figure">{option.value}%, {probabilityWord(option.value)}</strong>
            </label>
          ))}
        </fieldset>

        <fieldset className="field-group">
          <legend className="eyebrow">Available</legend>
          <div className="attacker-list">
            {availableAttackers.map((attacker) => (
              <label className="choice-line" key={attacker.id}>
                  <input
                    type="checkbox"
                    checked={session.selectedAttackerIds.includes(attacker.id)}
                    disabled={!session.selectedAttackerIds.includes(attacker.id) && session.selectedAttackerIds.length >= 6}
                    onChange={() => toggleAttacker(attacker.id)}
                />
                <span>{attacker.name}</span>
              </label>
            ))}
          </div>
          <p className="empty-copy">Choose up to six attackers. Activated units disappear until the next turn.</p>
          {availableAttackers.length === 0 ? <p className="empty-copy">All units have activated this turn.</p> : null}
        </fieldset>

        <button
          className="primary-action"
          type="button"
          disabled={session.selectedAttackerIds.length === 0 || analysis.kind === 'pending'}
          onClick={() => void calculate()}
        >
          {analysis.kind === 'pending' ? 'Finding best commitment…' : 'Find best commitment'}
        </button>
        {analysis.kind === 'pending' ? (
          <p className="progress-copy" role="status">Analysing {analysis.completed + 1} of {Math.max(analysis.total, 1)} attackers</p>
        ) : null}
        {analysis.kind === 'failure' ? (
          <div className="notice error" role="alert">
            <strong>Analysis stopped</strong>
            <p>{analysis.message}</p>
            <button className="text-action" type="button" onClick={() => void calculate()}>Try again</button>
          </div>
        ) : null}
      </section>

      {analysis.kind !== 'success' ? null : resolving ? (
        <OutcomeEntry
          target={target}
          currentWounds={targetWounds}
          onCancel={() => setResolving(false)}
          onContinue={continueAfterOutcome}
        />
      ) : (
        <RecommendationCard
          key={`${targetWounds}-${analysis.recommendation.headline}-${analysis.recommendation.totalProbability}`}
          recommendation={analysis.recommendation}
          onResolve={analysis.recommendation.firstActionId === null ? undefined : () => setResolving(true)}
        />
      )}
    </>
  )
}
