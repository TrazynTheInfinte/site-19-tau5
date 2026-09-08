import { useEffect, useRef } from 'react'
import { doc, runTransaction, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { resolveNight } from '../game/nightResolution'
import { isOvertimeReached, resolveOvertimeVote } from '../game/overtime'
import { tallyAccusation, tallyJudgment } from '../game/trial'
import { checkFactionWin, checkPersonalWins, checkSeedWins, checkSurviveToEndWins } from '../game/winConditions'
import { nightAbilityFor } from '../game/nightActionAbilities'
import { checkShowdownTrigger, rollChamberPosition } from '../game/showdown'
import {
  ACCUSATION_DURATION_MS,
  DEFENSE_DURATION_MS,
  DISCUSSION_DURATION_MS,
  JUDGMENT_DURATION_MS,
  MAX_TRIALS_PER_DAY,
  OVERTIME_VOTE_DURATION_MS,
} from '../game/constants'
import { seedTargetCount } from '../game/types'
import { addPersonalWinners } from '../firebase/repository/lobbyRepository'
import {
  addSeedTarget,
  consumeTomeTransfer,
  getAccusationVotes,
  getAllSecretRoles,
  getJudgmentVotes,
  getNightActions,
  getPuppeteerOverride,
  getShowdownPulls,
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

/** Called right after any elimination (a night kill or a vote, including overtime's). If
 * exactly the Enforcer and the last living CI member remain, breaks into the Showdown minigame
 * instead of letting the caller advance to its normal next phase. Returns true if it did -
 * callers must return immediately without doing their own normal-path advance in that case. */
async function tryEnterShowdown(
  lobbyId: string,
  expectedPhase: string,
  expectedCycle: number,
  finalStates: PlayerState[],
  roles: RoleAssignments,
): Promise<boolean> {
  const pair = checkShowdownTrigger(finalStates, roles)
  if (!pair) return false
  await guardedAdvance(lobbyId, expectedPhase, expectedCycle, {
    phase: 'showdown',
    showdown: {
      participantUids: [pair.enforcerUid, pair.ciUid],
      turnUid: pair.enforcerUid,
      pulls: 0,
      chamberPosition: rollChamberPosition(),
      loserUid: null,
    },
  })
  return true
}

/** Resolves exactly one Showdown trigger-pull: either it was fatal (eliminate the current
 * turn-holder, run the normal end-of-elimination bookkeeping, and end the game - guaranteed a
 * winner, since exactly one of the two participants remains alive afterward) or it wasn't
 * (just flip whose turn it is). */
async function resolveShowdownPull(lobbyId: string, lobby: LobbyDoc, roles: RoleAssignments, players: PlayerWithId[]) {
  const state = lobby.showdown
  if (!state) return
  const nextPulls = state.pulls + 1

  if (nextPulls !== state.chamberPosition) {
    const otherUid = state.participantUids.find((u) => u !== state.turnUid)!
    await updateDoc(doc(db, 'lobbies', lobbyId), { 'showdown.pulls': nextPulls, 'showdown.turnUid': otherUid })
    return
  }

  const loserUid = state.turnUid
  await eliminatePlayer(lobbyId, loserUid, lobby.cycle)
  await reassignTomeIfHolderDied(lobbyId, lobby.tomeHolderUid, loserUid, roles, players)
  await clearSenseTargetsOnDeath(lobbyId, roles, loserUid)

  const finalStates = toPlayerStates(players, loserUid)
  const event: EliminationEvent = { uid: loserUid, cause: 'showdown', cycle: lobby.cycle }
  const wins = [...checkPersonalWins(event, roles), ...checkSeedWins(finalStates, roles)]
  await addPersonalWinners(lobbyId, wins.map((w) => w.uid))

  await writePublicCycleLog(lobbyId, { cycle: lobby.cycle, eliminatedUid: loserUid, tie: false, causeOfDeath: 'showdown' })
  await updateDoc(doc(db, 'lobbies', lobbyId), { 'showdown.pulls': nextPulls, 'showdown.loserUid': loserUid })

  const winner = checkFactionWin(finalStates, roles)
  if (winner) await endGame(lobbyId, 'showdown', lobby.cycle, winner, finalStates, roles)
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
  const result = resolveNight(actions, roles)
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
      payload: { type: 'track' as const, targetUid: r.targetUid, visited: r.visited },
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
  if (await tryEnterShowdown(lobbyId, 'night', cycle, finalStates, roles)) return

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

/** Shared by every way a day can end without a winner: routes into Overtime if the next cycle
 * has reached the cap, else back to a normal Night. Clears trial - unrelated once the day's over. */
async function advanceToNextCycleOrOvertime(lobbyId: string, expectedPhase: string, lobby: LobbyDoc) {
  const nextCycle = lobby.cycle + 1
  if (isOvertimeReached(nextCycle, lobby.cycleCap)) {
    await guardedAdvance(lobbyId, expectedPhase, lobby.cycle, {
      phase: 'overtime',
      cycle: nextCycle,
      phaseDeadline: Date.now() + OVERTIME_VOTE_DURATION_MS,
      trial: null,
    })
  } else {
    await guardedAdvance(lobbyId, expectedPhase, lobby.cycle, {
      phase: 'night',
      cycle: nextCycle,
      phaseDeadline: null,
      trial: null,
    })
  }
}

/** Called when the current attempt didn't end in a conviction - no majority reached during
 * accusation, or a pardoned/tied judgment. If any of the day's MAX_TRIALS_PER_DAY attempts
 * remain, loops straight back into a fresh accusation phase (no return to Discussion in
 * between, matching ToS2's single continuous Day); otherwise the day ends with no elimination. */
async function advanceTrialOrEndDay(
  lobbyId: string,
  expectedPhase: string,
  lobby: LobbyDoc,
  spentTrialNumber: number,
) {
  const nextTrialNumber = spentTrialNumber + 1
  if (nextTrialNumber <= MAX_TRIALS_PER_DAY) {
    await guardedAdvance(lobbyId, expectedPhase, lobby.cycle, {
      phase: 'accusation',
      phaseDeadline: Date.now() + ACCUSATION_DURATION_MS,
      trial: { trialNumber: nextTrialNumber, accusedUid: null },
    })
    return
  }

  await writePublicCycleLog(lobbyId, { cycle: lobby.cycle, eliminatedUid: null, tie: true, causeOfDeath: null })
  await advanceToNextCycleOrOvertime(lobbyId, expectedPhase, lobby)
}

/** Accusation phase: majority reached -> defense; no majority (timeout, or every living player
 * has voted without reaching one) -> this attempt is spent. */
async function resolveAccusationPhase(lobbyId: string, lobby: LobbyDoc, players: PlayerWithId[]) {
  const trial = lobby.trial
  if (!trial) return
  const living = players.filter((p) => p.alive)
  const votes = await getAccusationVotes(lobbyId, lobby.cycle, trial.trialNumber)
  const { accusedUid } = tallyAccusation(votes, living.length)

  if (accusedUid) {
    await guardedAdvance(lobbyId, 'accusation', lobby.cycle, {
      phase: 'defense',
      phaseDeadline: Date.now() + DEFENSE_DURATION_MS,
      trial: { trialNumber: trial.trialNumber, accusedUid },
    })
    return
  }

  await advanceTrialOrEndDay(lobbyId, 'accusation', lobby, trial.trialNumber)
}

/** Defense is a straight timer - only the accused may speak (enforced in firestore.rules on
 * dayChat), nothing here to tally. */
async function resolveDefensePhase(lobbyId: string, lobby: LobbyDoc) {
  await guardedAdvance(lobbyId, 'defense', lobby.cycle, {
    phase: 'judgment',
    phaseDeadline: Date.now() + JUDGMENT_DURATION_MS,
  })
}

/** Judgment: Guilty needs strictly more Guilty votes than Innocent (see game/trial.ts) - a
 * conviction executes the accused and ends the day immediately; anything else is a pardon,
 * spending this attempt the same way a no-majority accusation does. */
async function resolveJudgmentPhase(lobbyId: string, lobby: LobbyDoc, players: PlayerWithId[]) {
  const trial = lobby.trial
  if (!trial?.accusedUid) return
  const accusedUid = trial.accusedUid
  const roles = await getAllSecretRoles(lobbyId)

  const votes = await getJudgmentVotes(lobbyId, lobby.cycle, trial.trialNumber)
  const override = await getPuppeteerOverride(lobbyId, lobby.cycle, trial.trialNumber)
  // Only the host can flip specialUsed (secretRoles writes are host-only), so this is where
  // "the Puppeteer has used their override" actually gets recorded, not at submission time.
  if (override) await markSpecialUsed(lobbyId, override.puppeteerUid)
  // Applied only to the in-memory tally, never written back to the target's own vote doc -
  // that's what keeps the override invisible to them (their UI reads their own doc, not this).
  const effectiveVotes = votes.map((v) => ({
    verdict: override && v.voterUid === override.targetVoterUid ? override.forcedVerdict : v.verdict,
  }))

  const { verdict } = tallyJudgment(effectiveVotes)

  if (verdict === 'innocent') {
    await advanceTrialOrEndDay(lobbyId, 'judgment', lobby, trial.trialNumber)
    return
  }

  await eliminatePlayer(lobbyId, accusedUid, lobby.cycle)
  await reassignTomeIfHolderDied(lobbyId, lobby.tomeHolderUid, accusedUid, roles, players)
  await clearSenseTargetsOnDeath(lobbyId, roles, accusedUid)

  const event: EliminationEvent = { uid: accusedUid, cause: 'vote', cycle: lobby.cycle }
  const wins = [...checkPersonalWins(event, roles), ...checkSeedWins(toPlayerStates(players, accusedUid), roles)]
  await addPersonalWinners(lobbyId, wins.map((w) => w.uid))

  await writePublicCycleLog(lobbyId, { cycle: lobby.cycle, eliminatedUid: accusedUid, tie: false, causeOfDeath: 'vote' })

  const finalStates = toPlayerStates(players, accusedUid)
  if (await tryEnterShowdown(lobbyId, 'judgment', lobby.cycle, finalStates, roles)) return

  const winner = checkFactionWin(finalStates, roles)
  if (winner) {
    await endGame(lobbyId, 'judgment', lobby.cycle, winner, finalStates, roles)
    return
  }

  await advanceToNextCycleOrOvertime(lobbyId, 'judgment', lobby)
}

/** Overtime's forced sudden-death vote - unrelated to the trial loop, and always ends the game
 * outright (a winner, or a draw) rather than looping or advancing to another cycle. */
async function resolveOvertimePhase(lobbyId: string, lobby: LobbyDoc, players: PlayerWithId[]) {
  const roles = await getAllSecretRoles(lobbyId)
  const living = players.filter((p) => p.alive)

  const votes = await getVotes(lobbyId, lobby.cycle)
  const tally = safeResolveOvertime(votes, living.map((p) => p.uid))

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
  if (await tryEnterShowdown(lobbyId, 'overtime', lobby.cycle, finalStates, roles)) return

  const winner = checkFactionWin(finalStates, roles)
  await endGame(lobbyId, 'overtime', lobby.cycle, winner ?? 'draw', finalStates, roles)
}

/** Exported for the Dr. Bright dev panel's per-player "Kill" buttons: an instant, out-of-band
 * elimination that runs the same downstream bookkeeping a real kill/vote does (Tome reassignment,
 * Whisperer sense-target clearing, personal-win checks, a Showdown trigger check, and a faction-
 * win check) without waiting for or interfering with whatever phase is currently in progress -
 * night/voting resolution, once it happens, proceeds exactly as if this had been a normal death.
 * Uses the 'kill' cause (closest existing fit for an off-screen elimination; deliberately not
 * 'vote', so it can't spuriously trigger The Fool). */
export async function devKillPlayer(lobbyId: string, lobby: LobbyDoc, players: PlayerWithId[], targetUid: string) {
  const roles = await getAllSecretRoles(lobbyId)
  await eliminatePlayer(lobbyId, targetUid, lobby.cycle)
  await reassignTomeIfHolderDied(lobbyId, lobby.tomeHolderUid, targetUid, roles, players)
  await clearSenseTargetsOnDeath(lobbyId, roles, targetUid)

  const finalStates = toPlayerStates(players, targetUid)
  const event: EliminationEvent = { uid: targetUid, cause: 'kill', cycle: lobby.cycle }
  const wins = [...checkPersonalWins(event, roles), ...checkSeedWins(finalStates, roles)]
  await addPersonalWinners(lobbyId, wins.map((w) => w.uid))

  if (await tryEnterShowdown(lobbyId, lobby.phase, lobby.cycle, finalStates, roles)) return

  const winner = checkFactionWin(finalStates, roles)
  if (winner) await endGame(lobbyId, lobby.phase, lobby.cycle, winner, finalStates, roles)
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
        phase: 'accusation',
        phaseDeadline: Date.now() + ACCUSATION_DURATION_MS,
        trial: { trialNumber: 1, accusedUid: null },
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

  // Showdown: watches for a new trigger-pull doc and resolves it (fatal or not). Each pull is
  // its own doc rather than a shared counter so a client's create is a simple self-authorship
  // check in firestore.rules, matching nightActions/votes - the resolver is still the only
  // thing that ever decides who dies or advances the phase.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'showdown' || !lobby.showdown) return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const pulls = await getShowdownPulls(lobbyId, lobby.cycle)
      if (pulls.length <= lobby.showdown!.pulls) return
      resolvingRef.current = true
      try {
        const roles = await getAllSecretRoles(lobbyId)
        await resolveShowdownPull(lobbyId, lobby, roles, playersRef.current)
      } catch (e) {
        console.error('resolveShowdownPull failed', e)
      } finally {
        resolvingRef.current = false
      }
    }

    const interval = setInterval(check, NIGHT_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.showdown?.pulls])

  // Tome hand-offs run independently of every phase's own resolution/timers - a hand-off can
  // happen any time across the whole trial loop or overtime, not just at the moment one ends.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid) return
    const tomeEligiblePhases: LobbyDoc['phase'][] = ['accusation', 'defense', 'judgment', 'overtime']
    if (!tomeEligiblePhases.includes(lobby.phase) || !lobby.tomeHolderUid) return
    let cancelled = false
    const holderUid = lobby.tomeHolderUid

    const check = async () => {
      if (cancelled) return
      const transfer = await consumeTomeTransfer(lobbyId, holderUid)
      if (transfer) {
        const roles = await getAllSecretRoles(lobbyId)
        const toAssignment = roles.get(transfer.toUid)
        const toPlayer = playersRef.current.find((p) => p.uid === transfer.toUid)
        if (toAssignment?.faction === 'ci' && toPlayer?.alive) {
          await updateDoc(doc(db, 'lobbies', lobbyId), { tomeHolderUid: transfer.toUid })
        }
      }
    }

    const interval = setInterval(check, DAY_POLL_MS)
    check()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.tomeHolderUid])

  // Accusation: majority reached (checked every poll, not just at timeout/all-voted) -> defense;
  // otherwise waits for the timer or everyone living having voted before spending the attempt.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'accusation' || !lobby.trial) return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const living = playersRef.current.filter((p) => p.alive)
      if (living.length === 0) return
      const votes = await getAccusationVotes(lobbyId, lobby.cycle, lobby.trial!.trialNumber)
      const { accusedUid } = tallyAccusation(votes, living.length)
      const timerExpired = !!lobby.phaseDeadline && Date.now() >= lobby.phaseDeadline
      const allVoted = votes.length >= living.length
      if (!accusedUid && !timerExpired && !allVoted) return
      resolvingRef.current = true
      try {
        await resolveAccusationPhase(lobbyId, lobby, playersRef.current)
      } catch (e) {
        console.error('resolveAccusationPhase failed', e)
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
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline, lobby?.trial?.trialNumber])

  // Defense: a straight timer, nothing to tally.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'defense') return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const timerExpired = !!lobby.phaseDeadline && Date.now() >= lobby.phaseDeadline
      if (!timerExpired) return
      resolvingRef.current = true
      try {
        await resolveDefensePhase(lobbyId, lobby)
      } catch (e) {
        console.error('resolveDefensePhase failed', e)
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
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline])

  // Judgment: early-exits once every living player except the accused has voted, same shape as
  // every other early-exit-on-consensus phase in this game.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'judgment' || !lobby.trial?.accusedUid) return
    let cancelled = false

    const check = async () => {
      if (resolvingRef.current || cancelled) return
      const timerExpired = !!lobby.phaseDeadline && Date.now() >= lobby.phaseDeadline
      if (!timerExpired) {
        const eligible = playersRef.current.filter((p) => p.alive && p.uid !== lobby.trial!.accusedUid)
        if (eligible.length === 0) return
        const votes = await getJudgmentVotes(lobbyId, lobby.cycle, lobby.trial!.trialNumber)
        const votedUids = new Set(votes.map((v) => v.voterUid))
        const allVoted = eligible.every((p) => votedUids.has(p.uid))
        if (!allVoted) return
      }
      resolvingRef.current = true
      try {
        await resolveJudgmentPhase(lobbyId, lobby, playersRef.current)
      } catch (e) {
        console.error('resolveJudgmentPhase failed', e)
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
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline, lobby?.trial?.trialNumber, lobby?.trial?.accusedUid])

  // Overtime: unrelated to the trial loop - a single forced vote, same early-exit shape it
  // always had.
  useEffect(() => {
    if (!lobbyId || !uid || !lobby || lobby.hostUid !== uid || lobby.phase !== 'overtime') return
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
      try {
        await resolveOvertimePhase(lobbyId, lobby, playersRef.current)
      } catch (e) {
        console.error('resolveOvertimePhase failed', e)
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
  }, [lobbyId, uid, lobby?.hostUid, lobby?.phase, lobby?.cycle, lobby?.phaseDeadline])
}
