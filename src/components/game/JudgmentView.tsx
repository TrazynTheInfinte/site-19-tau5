import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { submitJudgmentVote, subscribeMyJudgmentVote } from '../../firebase/repository/gameplayRepository'
import type { JudgmentVoteDoc } from '../../firebase/schema'

/** Final stage of a trial: everyone but the accused votes Guilty or Innocent. Guilty needs
 * strictly more Guilty votes than Innocent (see game/trial.ts) - a tie is a pardon. Not voting
 * before the timer expires simply isn't counted either way, matching ToS2's own UI (no separate
 * "Abstain" button). The vote is private - only your own choice is ever readable by you, and
 * the live Guilty/Innocent tally comes from the resolver-published LobbyDoc.trial counts, never
 * from reading other players' individual votes. */
export default function JudgmentView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [myVote, setMyVote] = useState<JudgmentVoteDoc | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const trialNumber = lobby?.trial?.trialNumber

  useEffect(() => {
    if (!lobby || !trialNumber || !uid) return
    return subscribeMyJudgmentVote(lobby.code, lobby.cycle, trialNumber, uid, setMyVote)
  }, [lobby?.code, lobby?.cycle, trialNumber, uid])

  useEffect(() => {
    if (!lobby?.phaseDeadline) return
    const tick = () => setRemainingMs(Math.max(0, lobby.phaseDeadline! - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lobby?.phaseDeadline])

  if (!uid || !lobby || !trialNumber || !lobby.trial?.accusedUid) return null

  const accusedUid = lobby.trial.accusedUid
  const accusedName = players.find((p) => p.uid === accusedUid)?.displayName ?? accusedUid
  const me = players.find((p) => p.uid === uid)
  const isAccused = uid === accusedUid

  async function vote(verdict: 'guilty' | 'innocent') {
    if (!uid || !lobby || !trialNumber) return
    try {
      await submitJudgmentVote(lobby.code, { cycle: lobby.cycle, trialNumber, voterUid: uid, verdict })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit verdict')
    }
  }

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="card" style={{ borderColor: 'var(--danger)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>Judgment: {accusedName}</h2>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--danger)' }}>{seconds}s</span>
      </div>
      <p className="faint">
        Guilty {lobby.trial.guiltyCount} — Innocent {lobby.trial.innocentCount}
      </p>
      <p className="faint">Votes are private — nobody can see who voted which way.</p>

      {isAccused ? (
        <p className="muted">You're on trial — awaiting the verdict.</p>
      ) : !me?.alive ? (
        <p className="muted">You're a ghost — you can't vote, but you can send a tip below.</p>
      ) : myVote ? (
        <p className="muted">You voted {myVote.verdict}.</p>
      ) : (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <button className="danger" onClick={() => vote('guilty')} style={{ marginRight: '0.5rem' }}>
            Guilty
          </button>
          <button onClick={() => vote('innocent')}>Innocent</button>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
