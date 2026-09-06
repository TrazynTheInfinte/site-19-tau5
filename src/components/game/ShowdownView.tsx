import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { submitShowdownPull, subscribeShowdownPulls } from '../../firebase/repository/gameplayRepository'
import type { ShowdownPullDoc } from '../../firebase/schema'

/** Shown to EVERYONE, not just the two participants - the outcome is fixed the instant the
 * phase starts (see game/showdown.ts), so no player choice is hidden here; there's nothing
 * lost, and everything gained, by letting the whole table watch it happen live. */
export default function ShowdownView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [pulls, setPulls] = useState<ShowdownPullDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lobby) return
    return subscribeShowdownPulls(lobby.code, lobby.cycle, setPulls)
  }, [lobby?.code, lobby?.cycle])

  if (!lobby || !lobby.showdown) return null
  const { participantUids, turnUid, loserUid, chamberPosition } = lobby.showdown
  const nameFor = (u: string) => players.find((p) => p.uid === u)?.displayName ?? u
  const isParticipant = !!uid && participantUids.includes(uid)
  const myTurn = !!uid && turnUid === uid && !loserUid

  async function pull() {
    if (!uid || !lobby) return
    try {
      await submitShowdownPull(lobby.code, { cycle: lobby.cycle, actorUid: uid, pullNumber: lobby.showdown!.pulls + 1 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pull the trigger')
    }
  }

  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
      <span className="field-label">Showdown</span>
      <h1 style={{ margin: '0.3rem 0' }}>
        {nameFor(participantUids[0])} <span className="faint">vs.</span> {nameFor(participantUids[1])}
      </h1>
      <p className="muted">One revolver. One bullet. Six chambers.</p>

      {loserUid ? (
        <p style={{ fontSize: '1.2rem', marginTop: 'var(--space-3)' }}>
          <strong>BANG.</strong> {nameFor(loserUid)} didn't make it.
        </p>
      ) : (
        <>
          <p style={{ marginTop: 'var(--space-3)' }}>
            {myTurn ? "It's your turn." : `Waiting on ${nameFor(turnUid)}...`}
          </p>
          {myTurn && (
            <button className="primary" onClick={pull} style={{ fontSize: '1.1rem', padding: '0.6rem 1.4rem' }}>
              Pull the trigger
            </button>
          )}
          {!isParticipant && <p className="faint">You're watching this one from the sidelines.</p>}
        </>
      )}
      {error && <p className="error-text">{error}</p>}

      {pulls.length > 0 && (
        <ul className="plain" style={{ marginTop: 'var(--space-3)', textAlign: 'left' }}>
          {pulls.map((p) => (
            <li key={p.pullNumber} style={{ padding: '0.2rem 0' }}>
              Pull {p.pullNumber}: {nameFor(p.actorUid)} —{' '}
              {p.pullNumber === chamberPosition ? <strong>BANG</strong> : 'click'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
