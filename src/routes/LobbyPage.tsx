import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LobbyProvider, useLobby } from '../context/LobbyContext'
import { GameStateProvider } from '../context/GameStateContext'
import { useHostHeartbeat, useHostTakeoverWatch, usePlayerPresence } from '../host/presence'
import { useHostResolver } from '../host/resolver'
import { rejoinLobby } from '../firebase/repository/lobbyRepository'
import { useEffect } from 'react'
import LobbyRoute from './LobbyRoute'
import GameRoute from './GameRoute'

function LobbyPageInner({ code }: { code: string }) {
  const { uid } = useAuth()
  const { lobby, players, loading } = useLobby()

  usePlayerPresence(code, uid)
  useHostHeartbeat(code, uid, lobby)
  useHostTakeoverWatch(code, uid, lobby)
  useHostResolver(code, uid, lobby, players)

  useEffect(() => {
    if (uid && players.some((p) => p.uid === uid)) {
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
