import { useEffect, useRef } from 'react'
import { doc, runTransaction, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { resolveNight } from '../game/nightResolution'
import { tallyVotes } from '../game/voting'
import { isOvertimeReached, resolveOvertimeVote } from '../game/overtime'
import { checkFactionWin, checkPersonalWins } from '../game/winConditions'
import { nightAbilityFor } from '../game/nightActionAbilities'
import { DAY_PHASE_DURATION_MS } from '../game/constants'
import { addPersonalWinners } from '../firebase/repository/lobbyRepository'
import {
  getAllSecretRoles,
  getNightActions,
  getVotes,
  markSaboteurUsed,
  writeNightResults,
  writePublicCycleLog,
} from '../firebase/repository/gameplayRepository'
import type { LobbyDoc, VoteDoc } from '../firebase/schema'
import type { PlayerWithId } from '../context/LobbyContext'
import type { EliminationEvent, PlayerState, RoleAssignments } from '../game/types'

const NIGHT_POLL_MS = 3_000
const DAY_POLL_MS = 2_000

async function eliminatePlayer(lobbyId: string, uid: string, cycle: number) {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'players', uid), { alive: false, eliminatedCycle: cycle })
}

function requiredNightActorUids(players: PlayerWithId[], roles: RoleAssignments): string[] {
  return players
    .filter((p) => p.alive)
    .filter((p) => {
      const assignment = roles.get(p.uid)
      if (!assignment) return false
      if (assignment.role === 'saboteur' && assignment.saboteurUsed) return false
      return nightAbilityFor(assignment.role) !== null
    })
    .map((p) => p.uid)
}

function toPlayerStates(players: PlayerWithId[], eliminatedUid: string | null): PlayerState[] {
  return players.map((p) => ({
    uid: p.uid,
    displayName: p.displayName,
    alive: p.uid === eliminatedUid ? false : p.alive,
    eliminatedCycle: null,
  }))
}

/** Only advances the lobby if it's still on the expected phase/cycle, guarding against a host takeover race. */
async function guardedAdvance(lobbyId: string, expectedPhase: string, expectedCycle: number, patch: Partial<LobbyDoc>) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, 'lobbies', lobbyId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return false
    const lobby = snap.data() as LobbyDoc
    if (lobby.phase !== expectedPhase || lobby.cycle !== expectedCycle) return false
    tx.update(ref, patch)
    return true
  })
}

/** Exported for the Dr. Bright dev panel's "force resolve night now" testing shortcut. */
export async function resolveNightCycle(lobbyId: string, cycle: number, players: PlayerWithId[]) {
  const roles = await getAllSecretRoles(lobbyId)
  const actions = await getNightActions(lobbyId, cycle)
  const result = resolveNight(actions, roles)

  if (result.eliminatedUid) {
    await eliminatePlayer(lobbyId, result.eliminatedUid, cycle)

    const event: EliminationEvent = { uid: result.eliminatedUid, cause: 'kill', cycle }
    const wins = checkPersonalWins(event, roles)
    await addPersonalWinners(lobbyId, wins.map((w) => w.uid))
  }

  const usedSaboteur = actions.find((a) => a.actionType === 'block')
  if (usedSaboteur) await markSaboteurUsed(lobbyId, usedSaboteur.actorUid)

  if (result.investigationResults.length > 0) {
    await writeNightResults(
      lobbyId,
      result.investigationResults.map((r) => ({
        cycle,
        recipientUid: r.actorUid,
        payload: { type: 'investigate' as const, targetUid: r.targetUid, targetFaction: r.targetFaction },
      })),
    )
  }

  await writePublicCycleLog(lobbyId, {
    cycle,
    eliminatedUid: result.eliminatedUid,
    tie: false,
    causeOfDeath: result.eliminatedUid ? 'kill' : null,
  })

  const winner = checkFactionWin(toPlayerStates(players, result.eliminatedUid), roles)

  if (winner) {
    await guardedAdvance(lobbyId, 'night', cycle, { phase: 'ended', status: 'ended', winner })
    return
  }

  await guardedAdvance(lobbyId, 'night', cycle, {
    phase: 'day',
    phaseDeadline: Date.now() + DAY_PHASE_DURATION_MS,
  })
}

function safeResolveOvertime(votes: VoteDoc[], livingUids: string[]) {
  try {
    return resolveOvertimeVote(
      votes.map((v) => ({ voterUid: v.voterUid, targetUid: v.targetUid })),
      livingUids,
    )
  } catch {
    // Hard timer expired before every living player voted; treat as a tie (no elimination) so
    // the game can still reach a draw instead of the resolver getting stuck.
    return { eliminatedUid: null, tie: true, counts: {} }
  }
}

async function resolveVotePhase(lobbyId: string, lobby: LobbyDoc, players: PlayerWithId[]) {
  const roles = await getAllSecretRoles(lobbyId)
  const living = players.filter((p) => p.alive)

  const votes = await getVotes(lobbyId, lobby.cycle)

  const isOvertime = lobby.phase === 'overtime'
  const tally = isOvertime
    ? safeResolveOvertime(votes, living.map((p) => p.uid))
    : tallyVotes(votes.map((v) => ({ voterUid: v.voterUid, targetUid: v.targetUid })))

  if (tally.eliminatedUid) {
    await eliminatePlayer(lobbyId, tally.eliminatedUid, lobby.cycle)

    const event: EliminationEvent = { uid: tally.eliminatedUid, cause: 'vote', cycle: lobby.cycle }
    const wins = checkPersonalWins(event, roles)
    await addPersonalWinners(lobbyId, wins.map((w) => w.uid))
  }

  await writePublicCycleLog(lobbyId, {
    cycle: lobby.cycle,
    eliminatedUid: tally.eliminatedUid,
    tie: tally.tie,
    causeOfDeath: tally.eliminatedUid ? 'vote' : null,
  })

  const winner = checkFactionWin(toPlayerStates(players, tally.eliminatedUid), roles)

  if (winner) {
    await guardedAdvance(lobbyId, lobby.phase, lobby.cycle, { phase: 'ended', status: 'ended', winner })
    return
  }

  if (isOvertime) {
    await guardedAdvance(lobbyId, 'overtime', lobby.cycle, { phase: 'ended', status: 'ended', winner: 'draw' })
    return
  }

  const nextCycle = lobby.cycle + 1
  if (isOvertimeReached(nextCycle, lobby.cycleCap)) {
    await guardedAdvance(lobbyId, 'day', lobby.cycle, {
      phase: 'overtime',
      cycle: nextCycle,
      phaseDeadline: Date.now() + DAY_PHASE_DURATION_MS,
    })
  } else {
    await guardedAdvance(lobbyId, 'day', lobby.cycle, {
      phase: 'night',
      cycle: nextCycle,
      phaseDeadline: null,
    })
  }
}

/** Runs only in the current host's tab. Watches the live phase/cycle and resolves each one automatically. */
export function useHostResolver(
  lobbyId: string | null,
  uid: string | null,
  lobby: LobbyDoc | null,
  players: PlayerWithId[],
) {
  const resolvingRef = useRef(false)

  // Latest players via a ref, not a dependency: `players` gets a new array reference on
  // every presence-heartbeat snapshot (every ~5s per connected player), and including it as
  // a dependency here would tear down/rebuild the poll interval — and fire an extra
  // immediate read-heavy `check()` — on every single one of those snapshots.
  const playersRef = useRef(players)
  useEffect(() => {
    playersRef.current = players
  }, [players])

  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'night') return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const currentPlayers = playersRef.current
      const roles = await getAllSecretRoles(lobbyId)
      const required = requiredNightActorUids(currentPlayers, roles)
      const actions = await getNightActions(lobbyId, lobby.cycle)
      const submittedUids = new Set(actions.map((a) => a.actorUid))
      const allSubmitted = required.every((r) => submittedUids.has(r))
      if (allSubmitted && !cancelled) {
        resolvingRef.current = true
        await resolveNightCycle(lobbyId, lobby.cycle, currentPlayers)
        resolvingRef.current = false
      }
    }

    const interval = setInterval(check, NIGHT_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle])

  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid) return
    if (lobby.phase !== 'day' && lobby.phase !== 'overtime') return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const timerExpired = !!lobby.phaseDeadline && Date.now() >= lobby.phaseDeadline
      if (!timerExpired) {
        const living = playersRef.current.filter((p) => p.alive)
        if (living.length === 0) return
        const votes = await getVotes(lobbyId, lobby.cycle)
        const votedUids = new Set(votes.map((v) => v.voterUid))
        const allVoted = living.every((p) => votedUids.has(p.uid))
        if (!allVoted) return
      }
      resolvingRef.current = true
      await resolveVotePhase(lobbyId, lobby, playersRef.current)
      resolvingRef.current = false
    }

    const interval = setInterval(check, DAY_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline])
}
