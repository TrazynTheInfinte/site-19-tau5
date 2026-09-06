import type { PlayerState, RoleAssignments } from './types'

export interface ShowdownPair {
  enforcerUid: string
  ciUid: string
}

/**
 * Detects the Showdown trigger: exactly two players remain alive, and they are the Enforcer
 * and any living Chaos Insurgency member (see CONTEXT.md's Showdown entry). No other pairing
 * qualifies - two Foundation members, or Enforcer + Serpent's Hand, just continue play normally.
 * The Enforcer's own gun/jam state is irrelevant here - the showdown revolver is a separate,
 * fresh mechanic, not a continuation of their Load/Shoot ability.
 */
export function checkShowdownTrigger(players: PlayerState[], roles: RoleAssignments): ShowdownPair | null {
  const living = players.filter((p) => p.alive)
  if (living.length !== 2) return null

  const [a, b] = living
  const roleA = roles.get(a.uid)
  const roleB = roles.get(b.uid)
  if (roleA?.role === 'enforcer' && roleB?.faction === 'ci') return { enforcerUid: a.uid, ciUid: b.uid }
  if (roleB?.role === 'enforcer' && roleA?.faction === 'ci') return { enforcerUid: b.uid, ciUid: a.uid }
  return null
}

/** A 6-chamber revolver, one bullet: the fatal pull number (1-6) is rolled once, up front, so
 * the outcome is fixed before anyone acts - no live choice a player makes affects who dies,
 * which is what makes it safe to show every pull to every spectator as it happens. */
export function rollChamberPosition(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 6)
}
