import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createLobby, joinLobby } from '../firebase/repository/lobbyRepository'

const DISPLAY_NAME_KEY = 'site19_display_name'

export default function HomeRoute() {
  const { uid, loading } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(DISPLAY_NAME_KEY) ?? '')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = displayName.trim().length > 0 && !!uid && !busy

  async function handleCreate() {
    if (!uid) return
    setBusy(true)
    setError(null)
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim())
      const code = await createLobby(uid, displayName.trim())
      navigate(`/lobby/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lobby')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!uid || !joinCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim())
      const code = joinCode.trim().toUpperCase()
      await joinLobby(code, uid, displayName.trim())
      navigate(`/lobby/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join lobby')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p>Signing in...</p>

  return (
    <div>
      <h1>Site-19: Tau-5 Protocol</h1>
      <div className="card">
        <label>
          Display name
          <br />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dr. Bright"
            maxLength={24}
          />
        </label>
      </div>

      <div className="card">
        <h2>Create a lobby</h2>
        <button disabled={!canSubmit} onClick={handleCreate}>
          Create
        </button>
      </div>

      <div className="card">
        <h2>Join a lobby</h2>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="CODE"
          maxLength={6}
          style={{ textTransform: 'uppercase' }}
        />
        <button disabled={!canSubmit || !joinCode.trim()} onClick={handleJoin} style={{ marginLeft: '0.5rem' }}>
          Join
        </button>
      </div>

      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
    </div>
  )
}
