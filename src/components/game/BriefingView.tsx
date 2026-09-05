import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { setBriefingReady } from '../../firebase/repository/lobbyRepository'

/** Opening talk-only day (cycle 0) before Night 1 - ends on the timer or once everyone's ready. */
export default function BriefingView() {
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
  const readyCount = players.filter((p) => p.briefingReady).length

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>Briefing</h2>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--accent)' }}>
          {seconds}s
        </span>
      </div>
      <p className="muted">
        No one has acted yet — there's nothing to vote on. Use this time to introduce yourselves, set the scene, or
        just talk before containment procedures begin.
      </p>
      <button
        className={me?.briefingReady ? undefined : 'primary'}
        disabled={me?.briefingReady}
        onClick={() => setBriefingReady(lobby.code, uid, true)}
      >
        {me?.briefingReady ? 'Waiting on others...' : "I'm ready"}
      </button>
      <span className="faint" style={{ marginLeft: 'var(--space-2)' }}>
        {readyCount}/{players.length} ready
      </span>
    </div>
  )
}
