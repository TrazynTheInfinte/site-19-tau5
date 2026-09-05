import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LobbyProvider, useLobby } from '../context/LobbyContext'
import { GameStateProvider } from '../context/GameStateContext'
import { useHostHeartbeat, useHostTakeoverWatch, usePlayerPresence } from '../host/presence'
import { useHostResolver } from '../host/resolver'
import { joinLobby, rejoinLobby } from '../firebase/repository/lobbyRepository'
import { useEffect, useRef } from 'react'
import LobbyRoute from './LobbyRoute'
import GameRoute from './GameRoute'
import { useAmbientAudio } from '../audio/useAmbientAudio'
import SoundToggle from '../components/audio/SoundToggle'

const DISPLAY_NAME_KEY = 'site19_display_name'

/** Shown when a signed-in visitor reaches a lobby URL directly (e.g. scanning the QR code)
 * without having gone through the home page's join form first. */
function JoinLobbyPrompt({ code, uid }: { code: string; uid: string }) {
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(DISPLAY_NAME_KEY) ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!displayName.trim()) return
    setBusy(true)
    setError(null)
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim())
      await joinLobby(code, uid, displayName.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join lobby')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>Join lobby {code}</h2>
      <label>
        Display name
        <br />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={24} />
      </label>
      <br />
      <button disabled={!displayName.trim() || busy} onClick={handleJoin} style={{ marginTop: '0.5rem' }}>
        {busy ? 'Joining...' : 'Join'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

function LobbyPageInner({ code }: { code: string }) {
  const { uid, error: authError } = useAuth()
  const { lobby, players, loading, error: lobbyError } = useLobby()
  const { enabled: soundEnabled, toggle: toggleSound } = useAmbientAudio(lobby?.phase ?? null)

  usePlayerPresence(code, uid)
  useHostHeartbeat(code, uid, lobby)
  useHostTakeoverWatch(code, uid, lobby)
  useHostResolver(code, uid, lobby, players)

  // Rejoin (mark presence back on) exactly once per (code, uid) pair. Must NOT depend on
  // `players` reactively beyond that one-time check: rejoinLobby is a write, which triggers
  // a new players snapshot, which would re-run this effect and write again — an unthrottled
  // write loop that previously burned through the whole Firestore daily quota in minutes.
  const rejoinedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!uid) return
    const key = `${code}:${uid}`
    if (rejoinedForRef.current === key) return
    if (players.some((p) => p.uid === uid)) {
      rejoinedForRef.current = key
      rejoinLobby(code, uid)
    }
  }, [code, uid, players])

  if (authError) return <p className="error-text">Sign-in failed: {authError}</p>
  if (lobbyError) return <p className="error-text">Couldn't load this lobby: {lobbyError}</p>
  if (loading) return <p>Loading lobby...</p>
  if (!lobby) return <p>Lobby not found.</p>
  if (!uid) return <p>Signing in...</p>

  const isMember = players.some((p) => p.uid === uid)
  if (!isMember) {
    if (lobby.status !== 'lobby') return <p>This game has already started — you can't join now.</p>
    return <JoinLobbyPrompt code={code} uid={uid} />
  }

  return (
    <>
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
      {lobby.status === 'lobby' ? (
        <LobbyRoute />
      ) : (
        <GameStateProvider>
          <GameRoute />
        </GameStateProvider>
      )}
    </>
  )
}

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>()
  if (!code) return <p>Missing lobby code.</p>
  return (
    <LobbyProvider lobbyId={code}>
      <LobbyPageInner code={code} />
    </LobbyProvider>
  )
}
