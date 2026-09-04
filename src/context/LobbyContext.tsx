import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { subscribeLobby, subscribePlayers } from '../firebase/repository/lobbyRepository'
import type { LobbyDoc, PlayerDoc } from '../firebase/schema'

export interface PlayerWithId extends PlayerDoc {
  uid: string
}

interface LobbyContextValue {
  lobbyId: string | null
  lobby: LobbyDoc | null
  players: PlayerWithId[]
  loading: boolean
  error: string | null
}

const LobbyContext = createContext<LobbyContextValue>({
  lobbyId: null,
  lobby: null,
  players: [],
  loading: true,
  error: null,
})

export function LobbyProvider({ lobbyId, children }: { lobbyId: string | null; children: ReactNode }) {
  // Sign-in must complete before subscribing: Firestore rules require an authenticated
  // request, and a direct link (e.g. the lobby QR code) reaches this provider before
  // anonymous sign-in has necessarily finished. Subscribing too early got a silent
  // permission-denied error with nothing to surface it, leaving "Loading lobby..." stuck
  // forever - fixed here by waiting for `uid`, and by handling the error case at all.
  const { uid, loading: authLoading } = useAuth()
  const [lobby, setLobby] = useState<LobbyDoc | null>(null)
  const [players, setPlayers] = useState<PlayerWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lobbyId) {
      setLobby(null)
      setPlayers([])
      setLoading(false)
      return
    }
    if (authLoading || !uid) {
      setLoading(true)
      return
    }
    setLoading(true)
    setError(null)
    const handleError = (err: Error) => {
      setError(err.message)
      setLoading(false)
    }
    const unsubLobby = subscribeLobby(
      lobbyId,
      (doc) => {
        setLobby(doc)
        setLoading(false)
      },
      handleError,
    )
    const unsubPlayers = subscribePlayers(lobbyId, setPlayers, handleError)
    return () => {
      unsubLobby()
      unsubPlayers()
    }
  }, [lobbyId, uid, authLoading])

  return <LobbyContext.Provider value={{ lobbyId, lobby, players, loading, error }}>{children}</LobbyContext.Provider>
}

export function useLobby(): LobbyContextValue {
  return useContext(LobbyContext)
}
