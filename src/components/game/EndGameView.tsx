import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { setPlayerConnected } from '../../firebase/repository/lobbyRepository'
import { restartGame } from '../../host/restartGame'
import CycleLog from './CycleLog'

const WINNER_LABEL: Record<string, string> = {
  foundation: 'The Foundation contained the threat.',
  ci: 'The Chaos Insurgency has taken control.',
  draw: 'Overtime expired with no resolution. Draw.',
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
      <div className="card">
        <h2>Game over</h2>
        <p>{lobby.winner ? WINNER_LABEL[lobby.winner] : 'Unresolved.'}</p>
        {lobby.personalWinners.length > 0 && (
          <p>Personal wins: {lobby.personalWinners.map(nameFor).join(', ')}</p>
        )}
        {myRole && (
          <p>
            You were <strong>{myRole.role}</strong> ({myRole.faction}).
          </p>
        )}
      </div>
      <CycleLog />
      <div className="card">
        {isHost ? (
          <button disabled={busy} onClick={handleRestart}>
            {busy ? 'Restarting...' : 'Restart game (back to lobby)'}
          </button>
        ) : (
          <p>Waiting for the host to restart, or:</p>
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
