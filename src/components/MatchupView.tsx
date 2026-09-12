import { useMemo } from 'react'
import type { Roster } from '../domain/roster'
import { analyseMatchup } from '../engine/matchup/analyseMatchup'

type Props = Readonly<{ myRoster: Roster; opponentRoster: Roster }>

const oneDecimal = (value: number): string => value.toFixed(1)

export function MatchupView({ myRoster, opponentRoster }: Props) {
  const analysis = useMemo(
    () => analyseMatchup(myRoster.units, opponentRoster.units),
    [myRoster, opponentRoster],
  )

  return (
    <section className="matchup-section" aria-labelledby="matchup-heading">
      <p className="eyebrow">Matchup</p>
      <h2 id="matchup-heading">Bring the right tool</h2>
      <div className="best-matchups">
        {analysis.bestByTarget.map(({ target, attacker, cell }) => (
          <article className="matchup-card" key={target.id}>
            <span>Best into {target.name}</span>
            <strong>{attacker?.name ?? 'No attacking profile'}</strong>
            {cell === null ? null : (
              <small className="figure">{oneDecimal(cell.expectedDamage)} expected damage · {oneDecimal(cell.killProbability * 100)}% kill</small>
            )}
          </article>
        ))}
      </div>
      <details className="matrix-disclosure">
        <summary>Efficiency matrix</summary>
        <p>Expected enemy points removed per 100 attacker points.</p>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Attacker</th>{opponentRoster.units.map((target) => <th scope="col" key={target.id}>{target.name}</th>)}</tr></thead>
            <tbody>
              {myRoster.units.filter(({ weapons }) => weapons.length > 0).map((attacker) => (
                <tr key={attacker.id}>
                  <th scope="row">{attacker.name}</th>
                  {opponentRoster.units.map((target) => {
                    const cell = analysis.cells.find(({ attackerId, targetId }) => attackerId === attacker.id && targetId === target.id)
                    return <td className="figure" key={target.id}>{cell === undefined ? '—' : oneDecimal(cell.enemyPointsPerHundredPoints)}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="matrix-note">Figures use the complete target profile and each unit’s first weapon.</p>
      </details>
    </section>
  )
}
