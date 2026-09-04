import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLobby } from '../context/LobbyContext'
import { kickPlayer, setRolePoolSelection } from '../firebase/repository/lobbyRepository'
import { startGame } from '../host/startGame'
import { ALL_ROLE_IDS, ROLE_DEFINITIONS, type RoleId } from '../game/types'

const MIN_PLAYERS = 4

export default function LobbyRoute() {
  const { uid } = useAuth()
  const { lobbyId, lobby, players } = useLobby()
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  if (!lobbyId || !lobby || !uid) return null
  const isHost = lobby.hostUid === uid
  const shareUrl = `${window.location.origin}/lobby/${lobby.code}`

  function toggleRole(role: RoleId) {
    if (!isHost) return
    const selected = new Set(lobby!.rolePoolSelection)
    if (selected.has(role)) selected.delete(role)
    else selected.add(role)
    setRolePoolSelection(lobbyId!, [...selected])
  }

  async function handleStart() {
    if (!isHost) return
    setStarting(true)
    setError(null)
    try {
      await startGame(lobbyId!, players.map((p) => p.uid), lobby!.rolePoolSelection)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <h1>Lobby {lobby.code}</h1>
      <p>
        Share link: <code>{shareUrl}</code>
      </p>

      <div className="card">
        <h2>Players ({players.length})</h2>
        <ul>
          {players.map((p) => (
            <li key={p.uid}>
              {p.displayName} {p.isHost && '(host)'} {!p.connected && '- disconnected'}
              {isHost && p.uid !== uid && (
                <button style={{ marginLeft: '0.5rem' }} onClick={() => kickPlayer(lobbyId!, p.uid)}>
                  Kick
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="card">
          <h2>Role pool</h2>
          {ALL_ROLE_IDS.map((role) => (
            <label key={role} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={lobby.rolePoolSelection.includes(role)}
                onChange={() => toggleRole(role)}
              />{' '}
              {ROLE_DEFINITIONS[role].name} <span className={`faction-${ROLE_DEFINITIONS[role].faction}`}>({ROLE_DEFINITIONS[role].faction})</span>
            </label>
          ))}
        </div>
      )}

      {isHost ? (
        <button disabled={players.length < MIN_PLAYERS || starting} onClick={handleStart}>
          {starting ? 'Starting...' : `Start game (min ${MIN_PLAYERS} players)`}
        </button>
      ) : (
        <p>Waiting for the host to start the game...</p>
      )}

      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
    </div>
  )
}
