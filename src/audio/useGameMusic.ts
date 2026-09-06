import { useEffect, useRef, useState } from 'react'
import { MusicManager } from './musicManager'
import { EXECUTION_TRACK, REVEAL_TRACKS, VOTE_RESULT_TRACK, WIN_TRACKS, loopCategoryTracks, randomPick } from './tracks'
import { subscribeMySecretRole, subscribePublicCycleLog } from '../firebase/repository/gameplayRepository'
import type { GamePhase, LobbyDoc, SecretRoleDoc } from '../firebase/schema'
import type { LoopCategory } from './tracks'

function categoryForPhase(phase: GamePhase): LoopCategory | 'ended' {
  if (phase === 'lobby' || phase === 'briefing') return 'lobby'
  if (phase === 'night') return 'night'
  if (phase === 'day' || phase === 'overtime') return 'day'
  return 'ended'
}

/**
 * Owns one MusicManager for the component's lifetime, driving it from three independent
 * signals: the lobby's phase (looping ambient + the role-reveal transition), the player's own
 * secret role (needed for the reveal cue's faction), and the public cycle log (vote-result /
 * execution one-shots). `toggle` must be called directly from a button's onClick - same
 * user-gesture requirement the old procedural engine had.
 */
export function useGameMusic(lobbyId: string | null, uid: string | null, lobby: LobbyDoc | null) {
  const managerRef = useRef<MusicManager | null>(null)
  const [enabled, setEnabledState] = useState(false)

  const categoryRef = useRef<LoopCategory | 'ended' | null>(null)
  const prevPhaseRef = useRef<GamePhase | undefined>(undefined)
  const pendingRevealRef = useRef(false)
  const revealFiredRef = useRef(false)
  const roleRef = useRef<SecretRoleDoc | null>(null)
  const prevWinnerRef = useRef<LobbyDoc['winner'] | undefined>(undefined)
  const lastSeenCycleRef = useRef(-1)
  const cycleLogInitializedRef = useRef(false)

  useEffect(() => {
    managerRef.current = new MusicManager()
    return () => {
      managerRef.current?.destroy()
      managerRef.current = null
    }
  }, [])

  // Own role, for the reveal cue's faction - resolved independently of GameStateContext since
  // this hook is mounted above it (spans the whole lobby->game->ended lifetime, not just GameRoute).
  useEffect(() => {
    if (!lobbyId || !uid) return
    return subscribeMySecretRole(lobbyId, uid, (role) => {
      roleRef.current = role
      if (pendingRevealRef.current && role) {
        pendingRevealRef.current = false
        revealFiredRef.current = true
        managerRef.current?.playOneShot(REVEAL_TRACKS[role.faction])
      }
    })
  }, [lobbyId, uid])

  // Vote-result / execution one-shots, keyed off newly-added publicCycleLog entries only - the
  // initial snapshot (which can contain a whole finished game's history for a fresh page load)
  // is used just to set the high-water mark, never to fire cues for the past.
  useEffect(() => {
    if (!lobbyId) return
    return subscribePublicCycleLog(lobbyId, (entries) => {
      if (!cycleLogInitializedRef.current) {
        cycleLogInitializedRef.current = true
        lastSeenCycleRef.current = entries.reduce((max, e) => Math.max(max, e.cycle), -1)
        return
      }
      const newEntries = entries.filter((e) => e.cycle > lastSeenCycleRef.current).sort((a, b) => a.cycle - b.cycle)
      for (const entry of newEntries) {
        if (entry.causeOfDeath === 'vote' && entry.eliminatedUid) {
          managerRef.current?.playOneShot(EXECUTION_TRACK)
        } else if (entry.tie || entry.causeOfDeath === 'vote') {
          managerRef.current?.playOneShot(VOTE_RESULT_TRACK)
        }
        // Night kills (causeOfDeath 'kill') and no-action nights get no cue - matches the
        // game's existing "night is silent" theme.
      }
      if (entries.length > 0) {
        lastSeenCycleRef.current = Math.max(lastSeenCycleRef.current, ...entries.map((e) => e.cycle))
      }
    })
  }, [lobbyId])

  // Phase-driven ambient loop, the lobby->briefing reveal-transition edge, and the win sting.
  useEffect(() => {
    if (!lobby) return
    const phase = lobby.phase
    const category = categoryForPhase(phase)

    if (category !== categoryRef.current) {
      const enteringLobbyAfresh = category === 'lobby' && categoryRef.current !== null
      categoryRef.current = category
      managerRef.current?.crossfadeLoop(category === 'ended' ? null : randomPick(loopCategoryTracks(category)))
      if (enteringLobbyAfresh) {
        // A restart wipes publicCycleLog and starts cycle numbering over from 1 - without this,
        // the high-water mark from the finished game would suppress the new game's early cues.
        lastSeenCycleRef.current = -1
        cycleLogInitializedRef.current = false
      }
    }

    if (phase === 'lobby') {
      revealFiredRef.current = false
    } else if (phase === 'briefing' && prevPhaseRef.current === 'lobby' && !revealFiredRef.current) {
      // Only fires when THIS client actually observed the lobby->briefing transition - a fresh
      // mid-game join or a mid-briefing refresh never crosses this edge, so it never replays.
      if (roleRef.current) {
        revealFiredRef.current = true
        managerRef.current?.playOneShot(REVEAL_TRACKS[roleRef.current.faction])
      } else {
        pendingRevealRef.current = true
      }
    }

    if (prevWinnerRef.current === null && lobby.winner) {
      const track = WIN_TRACKS[lobby.winner]
      if (track) managerRef.current?.playOneShot(track)
    }
    prevWinnerRef.current = lobby.winner
    prevPhaseRef.current = phase
  }, [lobby?.phase, lobby?.winner])

  function toggle() {
    const manager = managerRef.current
    if (!manager) return
    if (categoryRef.current === null && lobby) {
      categoryRef.current = categoryForPhase(lobby.phase)
      const category = categoryRef.current
      manager.crossfadeLoop(category === 'ended' ? null : randomPick(loopCategoryTracks(category)))
    }
    const next = !enabled
    manager.setEnabled(next)
    setEnabledState(next)
  }

  return { enabled, toggle }
}
