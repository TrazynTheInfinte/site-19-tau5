import { useEffect } from 'react'
import { claimHost, heartbeatHost, HOST_STALE_MS, setPlayerConnected } from '../firebase/repository/lobbyRepository'
import type { LobbyDoc } from '../firebase/schema'

const HEARTBEAT_INTERVAL_MS = 5_000

/** Runs only in the current host's tab: periodically refreshes hostLastSeen. */
export function useHostHeartbeat(lobbyId: string | null, uid: string | null, lobby: LobbyDoc | null) {
  useEffect(() => {
    if (!lobbyId || !uid || !lobby) return
    if (lobby.hostUid !== uid) return
    const interval = setInterval(() => {
      heartbeatHost(lobbyId, uid)
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [lobbyId, uid, lobby?.hostUid, lobby])
}

/** Every connected player's own presence heartbeat, used for reconnect detection. */
export function usePlayerPresence(lobbyId: string | null, uid: string | null) {
  useEffect(() => {
    if (!lobbyId || !uid) return
    setPlayerConnected(lobbyId, uid, true)
    const interval = setInterval(() => {
      setPlayerConnected(lobbyId, uid, true)
    }, HEARTBEAT_INTERVAL_MS)
    const handleUnload = () => {
      // best-effort; Firestore has no reliable beacon write, reconnection heartbeat is the real mechanism
      setPlayerConnected(lobbyId, uid, false)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [lobbyId, uid])
}

/** If the current host looks stale, any other connected client can attempt takeover. */
export function useHostTakeoverWatch(lobbyId: string | null, uid: string | null, lobby: LobbyDoc | null) {
  useEffect(() => {
    if (!lobbyId || !uid || !lobby) return
    if (lobby.hostUid === uid) return
    if (lobby.status !== 'in_progress') return
    const staleness = Date.now() - lobby.hostLastSeen
    if (staleness < HOST_STALE_MS) return
    claimHost(lobbyId, uid)
  }, [lobbyId, uid, lobby])
}
