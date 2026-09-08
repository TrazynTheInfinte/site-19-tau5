import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { submitAccusationVote, subscribeAccusationVotes } from '../../firebase/repository/gameplayRepository'
import type { AccusationVoteDoc } from '../../firebase/schema'

/** First stage of a trial: vote to put someone on trial. Needs a strict majority of living
 * players to actually send someone to defense (see game/trial.ts) - not a forced choice, you
 * can simply not accuse anyone this attempt. */
export default function AccusationView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [votes, setVotes] = useState<AccusationVoteDoc[]>([])
  const [remainingMs, setRemainingMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const trialNumber = lobby?.trial?.trialNumber

  useEffect(() => {
    if (!lobby || !trialNumber) return
    return subscribeAccusationVotes(lobby.code, lobby.cycle, trialNumber, setVotes)
  }, [lobby?.code, lobby?.cycle, trialNumber])

  useEffect(() => {
    if (!lobby?.phaseDeadline) return
    const tick = () => setRemainingMs(Math.max(0, lobby.phaseDeadline! - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lobby?.phaseDeadline])

  if (!uid || !lobby || !trialNumber) return null

  const me = players.find((p) => p.uid === uid)
  const myVote = votes.find((v) => v.voterUid === uid)
  const living = players.filter((p) => p.alive)
  const majority = Math.floor(living.length / 2) + 1

  const tallyByTarget = new Map<string, number>()
  votes.forEach((v) => tallyByTarget.set(v.targetUid, (tallyByTarget.get(v.targetUid) ?? 0) + 1))

  async function accuse(targetUid: string) {
    if (!uid || !lobby || !trialNumber) return
    try {
      await submitAccusationVote(lobby.code, { cycle: lobby.cycle, trialNumber, voterUid: uid, targetUid })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit accusation')
    }
  }

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>Accusation (trial {trialNumber}/3)</h2>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            color: seconds <= 15 ? 'var(--danger)' : 'var(--accent)',
          }}
        >
          {seconds}s
        </span>
      </div>
      <p className="faint">Needs {majority} of {living.length} living players to send someone to trial.</p>

      {!me?.alive ? (
        <p className="muted">You're a ghost — you can't accuse, but you can send a tip below.</p>
      ) : myVote ? (
        <p className="muted">
          You accused {players.find((p) => p.uid === myVote.targetUid)?.displayName}. Waiting...
        </p>
      ) : (
        <div style={{ marginTop: 'var(--space-2)' }}>
          {living
            .filter((p) => p.uid !== uid)
            .map((p) => (
              <button key={p.uid} onClick={() => accuse(p.uid)} style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}>
                {p.displayName} ({tallyByTarget.get(p.uid) ?? 0})
              </button>
            ))}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
