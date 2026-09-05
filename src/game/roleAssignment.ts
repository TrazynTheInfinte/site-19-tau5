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
    const role = shuffledRoles[i]
    assignments.set(uid, {
      uid,
      role,
      faction: ROLE_DEFINITIONS[role].faction,
      markedTargetUid: null,
      saboteurUsed: false,
      specialUsed: false,
    })
  })

  const marked = [...assignments.values()].find((a) => a.role === 'theMarked')
  if (marked) {
    const foundationUids = [...assignments.values()].filter((a) => a.faction === 'foundation').map((a) => a.uid)
    if (foundationUids.length > 0) {
      const target = foundationUids[Math.floor(rng() * foundationUids.length)]
      assignments.set(marked.uid, { ...marked, markedTargetUid: target } satisfies RoleAssignment)
    }
  }

  return assignments
}
