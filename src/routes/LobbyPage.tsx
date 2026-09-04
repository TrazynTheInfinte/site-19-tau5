import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LobbyProvider, useLobby } from '../context/LobbyContext'
import { GameStateProvider } from '../context/GameStateContext'
import { useHostHeartbeat, useHostTakeoverWatch, usePlayerPresence } from '../host/presence'
import { useHostResolver } from '../host/resolver'
import { rejoinLobby } from '../firebase/repository/lobbyRepository'
import { useEffect, useRef } from 'react'
import LobbyRoute from './LobbyRoute'
import GameRoute from './GameRoute'

function LobbyPageInner({ code }: { code: string }) {
  const { uid } = useAuth()
  const { lobby, players, loading } = useLobby()

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

  if (loading) return <p>Loading lobby...</p>
  if (!lobby) return <p>Lobby not found.</p>

  if (lobby.status === 'lobby') return <LobbyRoute />
  return (
    <GameStateProvider>
      <GameRoute />
    </GameStateProvider>
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
