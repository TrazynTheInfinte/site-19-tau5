import { ROLE_DEFINITIONS, type RoleAssignment, type RoleAssignments, type RoleId } from './types'

/** Injectable RNG (0 <= x < 1) so assignment is deterministic in tests. */
export type Rng = () => number

const MAX_ATTEMPTS = 1000

function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function makeAssignment(uid: string, role: RoleId): RoleAssignment {
  return {
    uid,
    role,
    faction: ROLE_DEFINITIONS[role].faction,
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
    bulletsLoaded: 0,
    gunJammed: false,
    senseTargetUid: null,
    seededUids: [],
  }
}

/** Mutates in place: gives theMarked a random Foundation target, if both are present. */
function assignMarkedTarget(assignments: RoleAssignments, rng: Rng): void {
  const marked = [...assignments.values()].find((a) => a.role === 'theMarked')
  if (!marked) return
  const foundationUids = [...assignments.values()].filter((a) => a.faction === 'foundation').map((a) => a.uid)
  if (foundationUids.length === 0) return
  const target = foundationUids[Math.floor(rng() * foundationUids.length)]
  assignments.set(marked.uid, { ...marked, markedTargetUid: target } satisfies RoleAssignment)
}

/**
 * Assigns one role per player from `enabledRoles`, satisfying the three invariants from
 * ADR-0002: Foundation is always the majority faction, at least one CI role is present, and
 * at least one Serpent's Hand role is present. "Majority" here means plurality — Foundation
 * outnumbers CI and outnumbers Serpent's Hand individually — not a strict >50% of all players.
 * A strict >50% reading is mathematically incompatible with requiring both a CI and a
 * Serpent's Hand role at once in a 4-player game (majority-of-4 needs 3 Foundation, leaving
 * only 1 slot for two required minority roles), so plurality is the reading that actually
 * supports the 4-6 player range this game targets.
 *
 * Rejection-sampled; a small pre-check ensures the requested pool/player-count combination
 * can actually satisfy the invariants before attempting, so failure is a clear thrown error
 * rather than a silent infinite loop.
 */
export function assignRoles(playerUids: string[], enabledRoles: RoleId[], rng: Rng): RoleAssignments {
  const n = playerUids.length
  if (n === 0) throw new Error('assignRoles: no players')
  if (enabledRoles.length < n) {
    throw new Error(`assignRoles: enabled role pool (${enabledRoles.length}) smaller than player count (${n})`)
  }

  const foundationPool = enabledRoles.filter((r) => ROLE_DEFINITIONS[r].faction === 'foundation')
  const ciPool = enabledRoles.filter((r) => ROLE_DEFINITIONS[r].faction === 'ci')
  const shPool = enabledRoles.filter((r) => ROLE_DEFINITIONS[r].faction === 'serpentsHand')

  if (ciPool.length === 0) throw new Error('assignRoles: enabled role pool has no Chaos Insurgency role')
  if (shPool.length === 0) throw new Error("assignRoles: enabled role pool has no Serpent's Hand role")

  // Most favorable case for feasibility: minimum 1 CI + 1 SH, maximizing Foundation's share.
  const minFoundationNeeded = n - 2
  if (minFoundationNeeded <= 1) {
    throw new Error(`assignRoles: cannot form a Foundation plurality with only ${n} players`)
  }
  if (foundationPool.length < minFoundationNeeded) {
    throw new Error(
      `assignRoles: not enough Foundation roles (${foundationPool.length}) in pool for a plurality of ${n} players`,
    )
  }

  let chosenRoles: RoleId[] | null = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffled = shuffle(enabledRoles, rng)
    const candidate = shuffled.slice(0, n)
    const foundationCount = candidate.filter((r) => ROLE_DEFINITIONS[r].faction === 'foundation').length
    const ciCount = candidate.filter((r) => ROLE_DEFINITIONS[r].faction === 'ci').length
    const shCount = candidate.filter((r) => ROLE_DEFINITIONS[r].faction === 'serpentsHand').length
    if (foundationCount > ciCount && foundationCount > shCount && ciCount >= 1 && shCount >= 1) {
      chosenRoles = candidate
      break
    }
  }

  if (!chosenRoles) {
    throw new Error('assignRoles: failed to find a valid role combination satisfying the faction invariants')
  }

  const shuffledPlayers = shuffle(playerUids, rng)
  const shuffledRoles = shuffle(chosenRoles, rng)

  const assignments: RoleAssignments = new Map()
  shuffledPlayers.forEach((uid, i) => {
    assignments.set(uid, makeAssignment(uid, shuffledRoles[i]))
  })

  assignMarkedTarget(assignments, rng)

  return assignments
}

/**
 * Debug-only alternative to assignRoles: forces a specific role onto anyone named in
 * `overrides` (uid -> RoleId), and randomly fills the rest of the roster from whatever roles
 * are left in the pool. Deliberately skips assignRoles' faction-plurality/CI/Serpent's-Hand
 * invariant checks entirely - the whole point of a manual override is to reach game states
 * normal random assignment wouldn't (e.g. constructing a specific 2-player endgame to test
 * Showdown), so enforcing "balanced" invariants here would defeat the purpose.
 */
export function assignRolesWithOverrides(
  playerUids: string[],
  enabledRoles: RoleId[],
  overrides: Map<string, RoleId>,
  rng: Rng,
): RoleAssignments {
  const n = playerUids.length
  if (n === 0) throw new Error('assignRolesWithOverrides: no players')

  // Deliberately no "pool size >= player count" pre-check here (unlike assignRoles) - an
  // override can force a role that isn't even in enabledRoles, so the pool only needs to cover
  // the players left AFTER overrides, which the check below (using remainingRoles) verifies.
  const usedRoles = new Set(overrides.values())
  if (usedRoles.size !== overrides.size) {
    throw new Error('assignRolesWithOverrides: the same role was forced onto more than one player')
  }

  const remainingPlayers = playerUids.filter((uid) => !overrides.has(uid))
  const remainingRoles = shuffle(
    enabledRoles.filter((r) => !usedRoles.has(r)),
    rng,
  )
  if (remainingRoles.length < remainingPlayers.length) {
    throw new Error('assignRolesWithOverrides: not enough remaining roles for the remaining players')
  }

  const assignments: RoleAssignments = new Map()
  let nextRoleIndex = 0
  for (const uid of playerUids) {
    const role = overrides.get(uid) ?? remainingRoles[nextRoleIndex++]
    assignments.set(uid, makeAssignment(uid, role))
  }

  assignMarkedTarget(assignments, rng)

  return assignments
}
