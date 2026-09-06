import { useEffect, useRef } from 'react'
import { doc, runTransaction, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { resolveNight } from '../game/nightResolution'
import { tallyVotes } from '../game/voting'
import { isOvertimeReached, resolveOvertimeVote } from '../game/overtime'
import { checkFactionWin, checkPersonalWins, checkSeedWins, checkSurviveToEndWins } from '../game/winConditions'
import { nightAbilityFor } from '../game/nightActionAbilities'
import { DISCUSSION_DURATION_MS, VOTING_DURATION_MS } from '../game/constants'
import { seedTargetCount } from '../game/types'
import { addPersonalWinners } from '../firebase/repository/lobbyRepository'
import {
  addSeedTarget,
  consumeTomeTransfer,
  getAllSecretRoles,
  getNightActions,
  getPuppeteerOverride,
  getVotes,
  jamGun,
  markSaboteurUsed,
  markSpecialUsed,
  setBulletsLoaded,
  setSenseTarget,
  writeNightResults,
  writePublicCycleLog,
} from '../firebase/repository/gameplayRepository'
import type { LobbyDoc } from '../firebase/schema'
import type { PlayerWithId } from '../context/LobbyContext'
import type { EliminationEvent, NightAction, PlayerState, RoleAssignments } from '../game/types'

const SPECIAL_ONCE_ACTION_TYPES = ['execute', 'trueKill', 'cartographerSwap'] as const

const NIGHT_POLL_MS = 3_000
const DAY_POLL_MS = 2_000

async function eliminatePlayer(lobbyId: string, uid: string, cycle: number) {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'players', uid), { alive: false, eliminatedCycle: cycle })
}

function requiredNightActorUids(
  players: PlayerWithId[],
  roles: RoleAssignments,
  tomeHolderUid: string | null,
): string[] {
  return players
    .filter((p) => p.alive)
    .filter((p) => {
      const assignment = roles.get(p.uid)
      if (!assignment) return false
      if (assignment.role === 'saboteur' && assignment.saboteurUsed) return false
      if (assignment.role === 'enforcer' && assignment.gunJammed) return false
      if (nightAbilityFor(assignment.role) !== null) return true
      // A CI role with no innate ability (Infiltrator) is still required to act if it's
      // currently the Tome holder - killing is the Tome's privilege now, not a role ability.
      return assignment.uid === tomeHolderUid
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

/** If the Tome's current holder was just eliminated, it passes to a random living CI
 * teammate (or nobody, if none remain) - the auto-pass half of the Tome mechanic. */
async function reassignTomeIfHolderDied(
  lobbyId: string,
  currentHolderUid: string | null,
  eliminatedUid: string,
  roles: RoleAssignments,
  players: PlayerWithId[],
) {
  if (currentHolderUid !== eliminatedUid) return
  const livingCiUids = players
    .filter((p) => p.alive && p.uid !== eliminatedUid && roles.get(p.uid)?.faction === 'ci')
    .map((p) => p.uid)
  const newHolder = livingCiUids.length > 0 ? livingCiUids[Math.floor(Math.random() * livingCiUids.length)] : null
  await updateDoc(doc(db, 'lobbies', lobbyId), { tomeHolderUid: newHolder })
}

/** Enforcer: consumes a bullet on any submitted kill (whether or not it lands - matches the
 * real mechanic where firing uses ammo regardless of outcome), and gains one on Load, capped
 * at 2. Whisperer: locks in a sense target the first time they submit 'sense' (a no-op on
 * later nights, since their target then persists automatically). Cultivator: records a new
 * seed target, capped at seedTargetCount(playerCount). */
async function applyPerRoleBookkeeping(
  lobbyId: string,
  actions: NightAction[],
  roles: RoleAssignments,
  totalPlayers: number,
) {
  const requiredSeeds = seedTargetCount(totalPlayers)
  for (const action of actions) {
    const assignment = roles.get(action.actorUid)
    if (!assignment) continue

    if (assignment.role === 'enforcer') {
      if (action.actionType === 'load') {
        await setBulletsLoaded(lobbyId, action.actorUid, Math.min(2, assignment.bulletsLoaded + 1))
      } else if (action.actionType === 'kill') {
        await setBulletsLoaded(lobbyId, action.actorUid, Math.max(0, assignment.bulletsLoaded - 1))
      }
    } else if (assignment.role === 'whisperer' && action.actionType === 'sense' && !assignment.senseTargetUid) {
      await setSenseTarget(lobbyId, action.actorUid, action.targetUid)
    } else if (
      assignment.role === 'cultivator' &&
      action.actionType === 'seed' &&
      !assignment.seededUids.includes(action.targetUid) &&
      assignment.seededUids.length < requiredSeeds
    ) {
      await addSeedTarget(lobbyId, action.actorUid, action.targetUid)
    }
  }
}

/** If an Enforcer's kill this cycle connected and the target was Foundation, their weapon
 * jams for the rest of the game - no more loading or shooting. */
async function jamEnforcerIfFriendlyKill(lobbyId: string, actions: NightAction[], roles: RoleAssignments, eliminatedUid: string) {
  const killAction = actions.find((a) => a.actionType === 'kill' && a.targetUid === eliminatedUid)
  if (!killAction) return
  const shooter = roles.get(killAction.actorUid)
  if (shooter?.role !== 'enforcer') return
  if (roles.get(eliminatedUid)?.faction === 'foundation') {
    await jamGun(lobbyId, killAction.actorUid)
  }
}

/** Any Whisperer sensing the just-eliminated player (by any cause) has their target cleared,
 * so they can pick a new one on a future night. */
async function clearSenseTargetsOnDeath(lobbyId: string, roles: RoleAssignments, eliminatedUid: string) {
  for (const assignment of roles.values()) {
    if (assignment.role === 'whisperer' && assignment.senseTargetUid === eliminatedUid) {
      await setSenseTarget(lobbyId, assignment.uid, null)
    }
  }
}

/** Shared by every game-ending path (night kill wins it, day vote wins it, overtime draws):
 * records any Puppeteer/Cartographer survive-to-end wins alongside the main outcome. */
async function endGame(
  lobbyId: string,
  expectedPhase: string,
  expectedCycle: number,
  winner: 'foundation' | 'ci' | 'draw',
  finalPlayers: PlayerState[],
  roles: RoleAssignments,
) {
  const surviveWins = checkSurviveToEndWins(finalPlayers, roles)
  if (surviveWins.length > 0) await addPersonalWinners(lobbyId, surviveWins.map((w) => w.uid))
  await guardedAdvance(lobbyId, expectedPhase, expectedCycle, { phase: 'ended', status: 'ended', winner })
}

/** Whisperer's passive sense result for this cycle, if they have a locked (or just-locked)
 * target: who that target visited, and who visited them - computed straight from the raw
 * action list, unaffected by blocks/protection (an all-seeing passive, not a disruptable one). */
function computeSenseResults(actions: NightAction[], roles: RoleAssignments) {
  const results: { recipientUid: string; targetUid: string; visited: string | null; visitedBy: string[] }[] = []
  for (const assignment of roles.values()) {
    if (assignment.role !== 'whisperer') continue
    const lockAction = actions.find((a) => a.actorUid === assignment.uid && a.actionType === 'sense')
    const senseTarget = assignment.senseTargetUid ?? lockAction?.targetUid ?? null
    if (!senseTarget) continue
    const visited = actions.find((a) => a.actorUid === senseTarget && a.actionType !== 'sense')?.targetUid ?? null
    const visitedBy = actions
      .filter((a) => a.targetUid === senseTarget && a.actionType !== 'sense')
      .map((a) => a.actorUid)
    results.push({ recipientUid: assignment.uid, targetUid: senseTarget, visited, visitedBy })
  }
  return results
}

/** Exported for the Dr. Bright dev panel's "force resolve night now" testing shortcut. */
export async function resolveNightCycle(lobbyId: string, lobby: LobbyDoc, players: PlayerWithId[]) {
  const cycle = lobby.cycle
  const roles = await getAllSecretRoles(lobbyId)
  const actions = await getNightActions(lobbyId, cycle)
  const result = resolveNight(actions, roles, lobby.tomeHolderUid)
  const senseResults = computeSenseResults(actions, roles)

  await applyPerRoleBookkeeping(lobbyId, actions, roles, players.length)

  if (result.eliminatedUid) {
    await eliminatePlayer(lobbyId, result.eliminatedUid, cycle)
    await reassignTomeIfHolderDied(lobbyId, lobby.tomeHolderUid, result.eliminatedUid, roles, players)
    await jamEnforcerIfFriendlyKill(lobbyId, actions, roles, result.eliminatedUid)
    await clearSenseTargetsOnDeath(lobbyId, roles, result.eliminatedUid)

    const event: EliminationEvent = { uid: result.eliminatedUid, cause: 'kill', cycle }
    const wins = [...checkPersonalWins(event, roles), ...checkSeedWins(toPlayerStates(players, result.eliminatedUid), roles)]
    await addPersonalWinners(lobbyId, wins.map((w) => w.uid))
  }

  const usedSaboteur = actions.find((a) => a.actionType === 'block')
  if (usedSaboteur) await markSaboteurUsed(lobbyId, usedSaboteur.actorUid)

  for (const action of actions) {
    if ((SPECIAL_ONCE_ACTION_TYPES as readonly string[]).includes(action.actionType)) {
      await markSpecialUsed(lobbyId, action.actorUid)
    }
  }

  const resultDocs = [
    ...result.investigationResults.map((r) => ({
      cycle,
      recipientUid: r.actorUid,
      payload: { type: 'investigate' as const, targetUid: r.targetUid, targetFaction: r.targetFaction },
    })),
    ...result.trackResults.map((r) => ({
      cycle,
      recipientUid: r.actorUid,
      payload: { type: 'track' as const, targetUid: r.targetUid, acted: r.acted },
    })),
    ...senseResults.map((r) => ({
      cycle,
      recipientUid: r.recipientUid,
      payload: { type: 'sense' as const, targetUid: r.targetUid, visited: r.visited, visitedBy: r.visitedBy },
    })),
  ]
  if (resultDocs.length > 0) {
    await writeNightResults(lobbyId, resultDocs)
  }

  await writePublicCycleLog(lobbyId, {
    cycle,
    eliminatedUid: result.eliminatedUid,
    tie: false,
    causeOfDeath: result.eliminatedUid ? 'kill' : null,
  })

  const finalStates = toPlayerStates(players, result.eliminatedUid)
  const winner = checkFactionWin(finalStates, roles)

  if (winner) {
    await endGame(lobbyId, 'night', cycle, winner, finalStates, roles)
    return
  }

  // Fresh discussionReady for the new cycle - unlike briefingReady (reset once at game start),
  // this has to be rearmed every time a discussion phase begins.
  const readyResetBatch = writeBatch(db)
  for (const p of players) {
    readyResetBatch.update(doc(db, 'lobbies', lobbyId, 'players', p.uid), { discussionReady: false })
  }
  await readyResetBatch.commit()

  await guardedAdvance(lobbyId, 'night', cycle, {
    phase: 'discussion',
    phaseDeadline: Date.now() + DISCUSSION_DURATION_MS,
  })
}

function safeResolveOvertime(votes: { voterUid: string; targetUid: string | null }[], livingUids: string[]) {
  try {
    return resolveOvertimeVote(votes, livingUids)
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
  const override = await getPuppeteerOverride(lobbyId, lobby.cycle)
  // Only the host can flip specialUsed (secretRoles writes are host-only), so this is where
  // "the Puppeteer has used their override" actually gets recorded, not at submission time.
  if (override) await markSpecialUsed(lobbyId, override.puppeteerUid)
  // Applied only to the in-memory tally, never written back to the target's own vote doc -
  // that's what keeps the override invisible to them (their UI reads their own doc, not this).
  const effectiveVotes = votes.map((v) => ({
    voterUid: v.voterUid,
    targetUid: override && v.voterUid === override.targetVoterUid ? override.forcedTarget : v.targetUid,
  }))

  const isOvertime = lobby.phase === 'overtime'
  const tally = isOvertime ? safeResolveOvertime(effectiveVotes, living.map((p) => p.uid)) : tallyVotes(effectiveVotes)

  if (tally.eliminatedUid) {
    await eliminatePlayer(lobbyId, tally.eliminatedUid, lobby.cycle)
    await reassignTomeIfHolderDied(lobbyId, lobby.tomeHolderUid, tally.eliminatedUid, roles, players)
    await clearSenseTargetsOnDeath(lobbyId, roles, tally.eliminatedUid)

    const event: EliminationEvent = { uid: tally.eliminatedUid, cause: 'vote', cycle: lobby.cycle }
    const wins = [
      ...checkPersonalWins(event, roles),
      ...checkSeedWins(toPlayerStates(players, tally.eliminatedUid), roles),
    ]
    await addPersonalWinners(lobbyId, wins.map((w) => w.uid))
  }

  await writePublicCycleLog(lobbyId, {
    cycle: lobby.cycle,
    eliminatedUid: tally.eliminatedUid,
    tie: tally.tie,
    causeOfDeath: tally.eliminatedUid ? 'vote' : null,
  })

  const finalStates = toPlayerStates(players, tally.eliminatedUid)
  const winner = checkFactionWin(finalStates, roles)

  if (winner) {
    await endGame(lobbyId, lobby.phase, lobby.cycle, winner, finalStates, roles)
    return
  }

  if (isOvertime) {
    await endGame(lobbyId, 'overtime', lobby.cycle, 'draw', finalStates, roles)
    return
  }

  const nextCycle = lobby.cycle + 1
  if (isOvertimeReached(nextCycle, lobby.cycleCap)) {
    // Overtime skips discussion entirely - straight from voting into the next (forced) vote.
    await guardedAdvance(lobbyId, 'voting', lobby.cycle, {
      phase: 'overtime',
      cycle: nextCycle,
      phaseDeadline: Date.now() + VOTING_DURATION_MS,
    })
  } else {
    await guardedAdvance(lobbyId, 'voting', lobby.cycle, {
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

  // Briefing (cycle 0): a talk-only opening phase - ends on whichever comes first, the 1-minute
  // timer or everyone clicking ready (same early-exit pattern the discussion phase uses) - then
  // goes straight to Night 1. No vote tally, no win check (nobody can be eliminated before
  // anyone's even acted), no Tome hand-off (nothing to hand off from before Night 1 assigns it).
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'briefing') return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const timerExpired = !!lobby.phaseDeadline && Date.now() >= lobby.phaseDeadline
      const allReady = playersRef.current.length > 0 && playersRef.current.every((p) => p.briefingReady)
      if (!timerExpired && !allReady) return
      resolvingRef.current = true
      await guardedAdvance(lobbyId, 'briefing', 0, { phase: 'night', cycle: 1, phaseDeadline: null })
      resolvingRef.current = false
    }

    const interval = setInterval(check, DAY_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.phaseDeadline])

  // Discussion (every cycle after Night 1's first cycle): talk-only, same early-exit shape as
  // briefing - the 1-minute timer, or everyone clicking ready - then straight into voting. No
  // vote tally here at all, just the phase hand-off.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'discussion') return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const timerExpired = !!lobby.phaseDeadline && Date.now() >= lobby.phaseDeadline
      const living = playersRef.current.filter((p) => p.alive)
      const allReady = living.length > 0 && living.every((p) => p.discussionReady)
      if (!timerExpired && !allReady) return
      resolvingRef.current = true
      await guardedAdvance(lobbyId, 'discussion', lobby.cycle, {
        phase: 'voting',
        phaseDeadline: Date.now() + VOTING_DURATION_MS,
      })
      resolvingRef.current = false
    }

    const interval = setInterval(check, DAY_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline])

  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'night') return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const currentPlayers = playersRef.current
      const roles = await getAllSecretRoles(lobbyId)
      const required = requiredNightActorUids(currentPlayers, roles, lobby.tomeHolderUid)
      const actions = await getNightActions(lobbyId, lobby.cycle)
      const submittedUids = new Set(actions.map((a) => a.actorUid))
      const allSubmitted = required.every((r) => submittedUids.has(r))
      if (allSubmitted && !cancelled) {
        resolvingRef.current = true
        try {
          await resolveNightCycle(lobbyId, lobby, currentPlayers)
        } catch (e) {
          // Without this, a thrown error here leaves resolvingRef stuck true forever -
          // every future poll silently no-ops and the game never advances again.
          console.error('resolveNightCycle failed', e)
        } finally {
          resolvingRef.current = false
        }
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
    if (lobby.phase !== 'voting' && lobby.phase !== 'overtime') return
    let cancelled = false

    const check = async () => {
      if (cancelled) return
      // Applying a pending Tome transfer runs independently of vote resolution/timers - a
      // hand-off can happen any time during voting, not just at the moment voting ends.
      if (lobby.tomeHolderUid) {
        const transfer = await consumeTomeTransfer(lobbyId, lobby.tomeHolderUid)
        if (transfer) {
          const roles = await getAllSecretRoles(lobbyId)
          const toAssignment = roles.get(transfer.toUid)
          const toPlayer = playersRef.current.find((p) => p.uid === transfer.toUid)
          if (toAssignment?.faction === 'ci' && toPlayer?.alive) {
            await updateDoc(doc(db, 'lobbies', lobbyId), { tomeHolderUid: transfer.toUid })
          }
        }
      }

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
      try {
        await resolveVotePhase(lobbyId, lobby, playersRef.current)
      } catch (e) {
        console.error('resolveVotePhase failed', e)
      } finally {
        resolvingRef.current = false
      }
    }

    const interval = setInterval(check, DAY_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline, lobby?.tomeHolderUid])
}
