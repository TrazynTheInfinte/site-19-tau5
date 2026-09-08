import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'

/** Informational only - the actual defense happens through the (phase-restricted) day chat
 * below: only the accused may post publicly during 'defense', everyone else is limited to
 * whispers (enforced in firestore.rules on dayChat, mirroring ToS2's real trial system). */
export default function DefenseView() {
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

  if (!lobby || !lobby.trial?.accusedUid) return null
  const accusedUid = lobby.trial.accusedUid
  const accusedName = players.find((p) => p.uid === accusedUid)?.displayName ?? accusedUid
  const isAccused = uid === accusedUid
  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="card" style={{ borderColor: 'var(--danger)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>On trial: {accusedName}</h2>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--danger)' }}>{seconds}s</span>
      </div>
      {isAccused ? (
        <p className="muted">Defend yourself — you're the only one who can post to chat right now.</p>
      ) : (
        <p className="muted">Only {accusedName} may speak publicly. Everyone else can still whisper.</p>
      )}
    </div>
  )
}
