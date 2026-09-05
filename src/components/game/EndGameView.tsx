import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { setPlayerConnected } from '../../firebase/repository/lobbyRepository'
import { restartGame } from '../../host/restartGame'
import { ROLE_DEFINITIONS } from '../../game/types'
import CycleLog from './CycleLog'

const WINNER_LABEL: Record<string, string> = {
  foundation: 'The Foundation contained the threat.',
  ci: 'The Chaos Insurgency has taken control.',
  draw: 'Overtime expired with no resolution. Draw.',
}

const WINNER_COLOR: Record<string, string> = {
  foundation: 'var(--foundation)',
  ci: 'var(--ci)',
  draw: 'var(--text-muted)',
}

export default function EndGameView() {
  const { uid } = useAuth()
  const { lobbyId, lobby, players } = useLobby()
  const { myRole } = useGameState()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (!lobby || !lobbyId || !uid) return null
  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid
  const isHost = lobby.hostUid === uid
  const winnerColor = lobby.winner ? WINNER_COLOR[lobby.winner] : 'var(--text-muted)'

  async function handleRestart() {
    setBusy(true)
    try {
      await restartGame(lobbyId!, players.map((p) => p.uid))
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    setBusy(true)
    try {
      await setPlayerConnected(lobbyId!, uid!, false)
      navigate('/')
    } catch {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ borderColor: winnerColor, textAlign: 'center', padding: 'var(--space-4)' }}>
        <span className="field-label">Debrief</span>
        <h1 style={{ color: winnerColor, margin: 0 }}>{lobby.winner ? WINNER_LABEL[lobby.winner] : 'Unresolved'}</h1>
        {lobby.personalWinners.length > 0 && (
          <p style={{ marginTop: 'var(--space-3)' }}>
            {lobby.personalWinners.map((w) => (
              <span key={w} className="chip" style={{ color: 'var(--serpentshand)', marginRight: '0.4rem' }}>
                {nameFor(w)}
              </span>
            ))}
            <span className="faint"> — personal objective achieved</span>
          </p>
        )}
        {myRole && (
          <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
            You were <strong className={`faction-${myRole.faction}`}>{ROLE_DEFINITIONS[myRole.role].name}</strong>
          </p>
        )}
      </div>

      <CycleLog />

      <div className="card">
        {isHost ? (
          <button className="primary" disabled={busy} onClick={handleRestart}>
            {busy ? 'Restarting...' : 'Restart game (back to lobby)'}
          </button>
        ) : (
          <p className="muted">Waiting for the host to restart, or:</p>
        )}
        {!isHost && (
          <button disabled={busy} onClick={handleLeave}>
            {busy ? 'Leaving...' : 'Leave lobby'}
          </button>
        )}
      </div>
    </div>
  )
}
