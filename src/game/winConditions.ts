import {
  SURVIVE_TO_END_ROLES,
  seedTargetCount,
  type EliminationEvent,
  type FactionWinner,
  type PersonalWin,
  type PlayerState,
  type RoleAssignments,
} from './types'

/**
 * Per ADR-0001: Foundation wins when all CI are eliminated. CI wins when living CI count
 * exceeds living Foundation count. Serpent's Hand is excluded from this comparison entirely
 * — it neither helps nor hinders a CI win, and has no faction-wide win of its own.
 */
export function checkFactionWin(players: PlayerState[], roles: RoleAssignments): FactionWinner {
  const living = players.filter((p) => p.alive)
  const livingCi = living.filter((p) => roles.get(p.uid)?.faction === 'ci').length
  const livingFoundation = living.filter((p) => roles.get(p.uid)?.faction === 'foundation').length

  if (livingCi === 0) return 'foundation'
  if (livingCi > livingFoundation) return 'ci'
  return null
}

/**
 * Serpent's Hand roles win individually on specific events, not as a faction check run
 * every cycle. The Fool wins only when voted out (a night kill doesn't count). The Marked
 * wins whenever their secretly assigned target is eliminated, by either cause.
 */
export function checkPersonalWins(event: EliminationEvent, roles: RoleAssignments): PersonalWin[] {
  const wins: PersonalWin[] = []

  const eliminatedAssignment = roles.get(event.uid)
  if (event.cause === 'vote' && eliminatedAssignment?.role === 'theFool') {
    wins.push({ uid: eliminatedAssignment.uid, role: 'theFool' })
  }

  for (const assignment of roles.values()) {
    if (assignment.role === 'theMarked' && assignment.markedTargetUid === event.uid) {
      wins.push({ uid: assignment.uid, role: 'theMarked' })
    }
  }

  return wins
}

/**
 * The Puppeteer and The Cartographer both win by surviving to the end of the game, by
 * whatever means it ends (faction win or draw) - not triggered by an elimination event like
 * Fool/Marked, so this is checked once, at the moment the game actually ends.
 */
export function checkSurviveToEndWins(players: PlayerState[], roles: RoleAssignments): PersonalWin[] {
  const wins: PersonalWin[] = []
  for (const player of players) {
    if (!player.alive) continue
    const assignment = roles.get(player.uid)
    if (assignment && SURVIVE_TO_END_ROLES.includes(assignment.role)) {
      wins.push({ uid: player.uid, role: assignment.role })
    }
  }
  return wins
}

/**
 * The Cultivator wins once every player they've seeded is eliminated - but only once their
 * full seed set is assigned (seedTargetCount(playerCount), scaled down from Town of Salem's
 * fixed 3 for our smaller lobbies). Checked after every elimination, same as Fool/Marked,
 * since any of the seeded players dying (by vote, night kill, or anyone else's hand) can
 * complete it - not just the Cultivator's own hunt.
 */
export function checkSeedWins(players: PlayerState[], roles: RoleAssignments): PersonalWin[] {
  const wins: PersonalWin[] = []
  const requiredCount = seedTargetCount(players.length)
  const aliveByUid = new Map(players.map((p) => [p.uid, p.alive]))

  for (const assignment of roles.values()) {
    if (assignment.role !== 'cultivator') continue
    if (assignment.seededUids.length < requiredCount) continue
    const allSeededDead = assignment.seededUids.every((uid) => aliveByUid.get(uid) === false)
    if (allSeededDead) wins.push({ uid: assignment.uid, role: 'cultivator' })
  }

  return wins
}
