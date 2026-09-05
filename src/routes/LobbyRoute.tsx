import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLobby } from '../context/LobbyContext'
import { kickPlayer, leavePreGameLobby, setRolePoolSelection } from '../firebase/repository/lobbyRepository'
import { startGame } from '../host/startGame'
import { ALL_ROLE_IDS, ROLE_DEFINITIONS, type RoleId } from '../game/types'
import LobbyQrCode from '../components/lobby/LobbyQrCode'

const MIN_PLAYERS = 4

export default function LobbyRoute() {
  const { uid } = useAuth()
  const { lobbyId, lobby, players } = useLobby()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [leaving, setLeaving] = useState(false)

  if (!lobbyId || !lobby || !uid) return null
  const isHost = lobby.hostUid === uid
  const shareUrl = `${window.location.origin}/lobby/${lobby.code}`

  async function handleLeave() {
    setLeaving(true)
    try {
      await leavePreGameLobby(lobbyId!, uid!)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to leave lobby')
      setLeaving(false)
    }
  }

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
      <h1>
        Lobby <span style={{ color: 'var(--accent)' }}>{lobby.code}</span>
      </h1>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h2>Personnel ({players.length})</h2>
            <ul className="plain">
              {players.map((p) => (
                <li
                  key={p.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <span className={`status-dot ${!p.connected ? 'status-dot--dead' : ''}`} />
                  <span>{p.displayName}</span>
                  {p.isHost && <span className="chip" style={{ color: 'var(--accent)' }}>Host</span>}
                  {!p.connected && <span className="faint">disconnected</span>}
                  {isHost && p.uid !== uid && (
                    <button
                      className="danger"
                      style={{ marginLeft: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                      onClick={() => kickPlayer(lobbyId!, p.uid)}
                    >
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
              <p className="faint">Deselect any roles you don't want available this game.</p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.4rem 1rem',
                }}
              >
                {ALL_ROLE_IDS.map((role) => (
                  <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={lobby.rolePoolSelection.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>{ROLE_DEFINITIONS[role].name}</span>
                    <span className={`faction-${ROLE_DEFINITIONS[role].faction}`} style={{ fontSize: '0.75rem' }}>
                      {ROLE_DEFINITIONS[role].faction}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>Field access</h2>
            <LobbyQrCode url={shareUrl} />
            <p className="faint" style={{ marginTop: 'var(--space-2)' }}>
              Scan to join from a phone
            </p>
            <span className="field-label" style={{ marginTop: 'var(--space-2)' }}>
              Or share this code
            </span>
            <code style={{ fontSize: '1.1rem', letterSpacing: '0.1em' }}>{lobby.code}</code>
          </div>

          <div className="card">
            {isHost ? (
              <button
                className="primary"
                style={{ width: '100%' }}
                disabled={players.length < MIN_PLAYERS || starting}
                onClick={handleStart}
              >
                {starting ? 'Starting...' : `Start game (min ${MIN_PLAYERS})`}
              </button>
            ) : (
              <p className="muted">Waiting for the host to start the game...</p>
            )}

            <div style={{ marginTop: 'var(--space-3)' }}>
              {isHost ? (
                <p
                  className="faint"
                  title="Transfer or cancel isn't built yet - leaving as host mid-lobby is unsupported."
                >
                  (As host, leaving the lobby isn't supported yet.)
                </p>
              ) : (
                <button disabled={leaving} onClick={handleLeave}>
                  {leaving ? 'Leaving...' : 'Leave lobby'}
                </button>
              )}
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  )
}
