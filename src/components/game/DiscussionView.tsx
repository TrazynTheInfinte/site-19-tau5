import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { setDiscussionReady } from '../../firebase/repository/lobbyRepository'

/** Talk-only window before voting opens each cycle - ends on whichever comes first: the
 * 1-minute timer, or every living player clicking ready (same early-exit shape as Briefing). */
export default function DiscussionView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (!lobby?.phaseDeadline) return
    const tick = () => setRemainingMs(Math.max(0, lobby.phaseDeadline! - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lobby?.phaseDeadline])

  if (!lobby || !uid) return null
  const seconds = Math.ceil(remainingMs / 1000)
  const me = players.find((p) => p.uid === uid)
  const living = players.filter((p) => p.alive)
  const readyCount = living.filter((p) => p.discussionReady).length

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>Discussion</h2>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--accent)' }}>
          {seconds}s
        </span>
      </div>
      <p className="muted">Talk it over before voting opens.</p>
      {me?.alive ? (
        <>
          <button
            className={me?.discussionReady ? undefined : 'primary'}
            disabled={me?.discussionReady}
            onClick={() => setDiscussionReady(lobby.code, uid, true)}
          >
            {me?.discussionReady ? 'Waiting on others...' : "I'm ready to vote"}
          </button>
          <span className="faint" style={{ marginLeft: 'var(--space-2)' }}>
            {readyCount}/{living.length} ready
          </span>
        </>
      ) : (
        <p className="muted">You're a ghost — you can't vote, but you can send a tip below.</p>
      )}
    </div>
  )
}
