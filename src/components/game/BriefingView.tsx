import { useEffect, useState } from 'react'
import { useLobby } from '../../context/LobbyContext'

/** Opening talk-only day (cycle 0) before Night 1 - no voting, just a timer and a prompt. */
export default function BriefingView() {
  const { lobby } = useLobby()
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (!lobby?.phaseDeadline) return
    const tick = () => setRemainingMs(Math.max(0, lobby.phaseDeadline! - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lobby?.phaseDeadline])

  if (!lobby) return null
  const seconds = Math.ceil(remainingMs / 1000)

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
    </div>
  )
}
