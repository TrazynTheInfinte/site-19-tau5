import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
}

const LobbyContext = createContext<LobbyContextValue>({ lobbyId: null, lobby: null, players: [], loading: true })

export function LobbyProvider({ lobbyId, children }: { lobbyId: string | null; children: ReactNode }) {
  const [lobby, setLobby] = useState<LobbyDoc | null>(null)
  const [players, setPlayers] = useState<PlayerWithId[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lobbyId) {
      setLobby(null)
      setPlayers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubLobby = subscribeLobby(lobbyId, (doc) => {
      setLobby(doc)
      setLoading(false)
    })
    const unsubPlayers = subscribePlayers(lobbyId, setPlayers)
    return () => {
      unsubLobby()
      unsubPlayers()
    }
  }, [lobbyId])

  return <LobbyContext.Provider value={{ lobbyId, lobby, players, loading }}>{children}</LobbyContext.Provider>
}

export function useLobby(): LobbyContextValue {
  return useContext(LobbyContext)
}
