import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createLobby, joinLobby } from '../firebase/repository/lobbyRepository'

const DISPLAY_NAME_KEY = 'site19_display_name'

export default function HomeRoute() {
  const { uid, loading, error: authError } = useAuth()
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

  if (loading) return <p className="muted">Establishing secure connection...</p>

  return (
    <div className="grid-2">
      <div>
        <h1>Containment Protocol</h1>
        <p className="muted">
          A minority of personnel present at this Site have been compromised. Foundation staff must identify and
          remove the threat before Chaos Insurgency operatives seize control — while the Serpent's Hand pursues its
          own agenda in the shadows.
        </p>
        <p className="faint">4–8 players. One device each. Discussion happens out loud, over call, or in person.</p>

        {authError && (
          <div className="card" style={{ borderColor: 'var(--danger-dim)' }}>
            <h3 style={{ color: 'var(--danger)' }}>Sign-in failed</h3>
            <p className="error-text">{authError}</p>
            <p className="faint">
              Most likely cause: Anonymous sign-in isn't enabled in the Firebase console yet (Authentication →
              Sign-in method → Anonymous), or the values in <code>.env.local</code> don't match your Firebase
              project.
            </p>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="card">
          <span className="field-label">Personnel designation</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dr. Bright"
            maxLength={24}
          />
        </div>

        <div className="card">
          <h2>New session</h2>
          <button className="primary" disabled={!canSubmit} onClick={handleCreate}>
            Create lobby
          </button>
        </div>

        <div className="card">
          <h2>Join session</h2>
          <span className="field-label">Access code</span>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="CODE"
            maxLength={6}
            style={{ textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}
          />
          <button disabled={!canSubmit || !joinCode.trim()} onClick={handleJoin}>
            Join lobby
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
