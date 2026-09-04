import type { EliminationEvent, FactionWinner, PersonalWin, PlayerState, RoleAssignments } from './types'

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
