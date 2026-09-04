import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useLobby } from './LobbyContext'
import {
  subscribeGhostTips,
  subscribeMyNightResult,
  subscribeMySecretRole,
  subscribePublicCycleLog,
  subscribeVotes,
} from '../firebase/repository/gameplayRepository'
import type { GhostTipDoc, NightResultDoc, PublicCycleLogDoc, SecretRoleDoc, VoteDoc } from '../firebase/schema'

interface GameStateContextValue {
  myRole: SecretRoleDoc | null
  myNightResult: NightResultDoc | null
  publicCycleLog: PublicCycleLogDoc[]
  currentVotes: VoteDoc[]
  ghostTips: GhostTipDoc[]
}

const GameStateContext = createContext<GameStateContextValue>({
  myRole: null,
  myNightResult: null,
  publicCycleLog: [],
  currentVotes: [],
  ghostTips: [],
})

export function GameStateProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth()
  const { lobbyId, lobby } = useLobby()
  const cycle = lobby?.cycle ?? 0

  const [myRole, setMyRole] = useState<SecretRoleDoc | null>(null)
  const [myNightResult, setMyNightResult] = useState<NightResultDoc | null>(null)
  const [publicCycleLog, setPublicCycleLog] = useState<PublicCycleLogDoc[]>([])
  const [currentVotes, setCurrentVotes] = useState<VoteDoc[]>([])
  const [ghostTips, setGhostTips] = useState<GhostTipDoc[]>([])

  useEffect(() => {
    if (!lobbyId || !uid) return
    return subscribeMySecretRole(lobbyId, uid, setMyRole)
  }, [lobbyId, uid])

  useEffect(() => {
    if (!lobbyId || !uid || cycle === 0) {
      setMyNightResult(null)
      return
    }
    return subscribeMyNightResult(lobbyId, cycle, uid, setMyNightResult)
  }, [lobbyId, uid, cycle])

  useEffect(() => {
    if (!lobbyId) return
    return subscribePublicCycleLog(lobbyId, setPublicCycleLog)
  }, [lobbyId])

  useEffect(() => {
    if (!lobbyId || cycle === 0) {
      setCurrentVotes([])
      return
    }
    return subscribeVotes(lobbyId, cycle, setCurrentVotes)
  }, [lobbyId, cycle])

  useEffect(() => {
    if (!lobbyId) return
    return subscribeGhostTips(lobbyId, setGhostTips)
  }, [lobbyId])

  return (
    <GameStateContext.Provider value={{ myRole, myNightResult, publicCycleLog, currentVotes, ghostTips }}>
      {children}
    </GameStateContext.Provider>
  )
}

export function useGameState(): GameStateContextValue {
  return useContext(GameStateContext)
}
