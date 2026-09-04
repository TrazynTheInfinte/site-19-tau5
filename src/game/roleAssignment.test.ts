import { describe, expect, it } from 'vitest'
import { assignRoles } from './roleAssignment'
import { ALL_ROLE_IDS, ROLE_DEFINITIONS } from './types'

// Deterministic seeded RNG (mulberry32) so tests are reproducible.
function seededRng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const players = ['p1', 'p2', 'p3', 'p4', 'p5']

describe('assignRoles', () => {
  it('assigns exactly one role per player, all drawn from the enabled pool', () => {
    const assignments = assignRoles(players, ALL_ROLE_IDS, seededRng(42))
    expect(assignments.size).toBe(players.length)
    for (const uid of players) {
      const assignment = assignments.get(uid)
      expect(assignment).toBeDefined()
      expect(ALL_ROLE_IDS).toContain(assignment!.role)
    }
    const rolesUsed = [...assignments.values()].map((a) => a.role)
    expect(new Set(rolesUsed).size).toBe(rolesUsed.length) // no duplicate roles for MVP pool
  })

  it('is deterministic for a given seed', () => {
    const a = assignRoles(players, ALL_ROLE_IDS, seededRng(7))
    const b = assignRoles(players, ALL_ROLE_IDS, seededRng(7))
    expect([...a.entries()]).toEqual([...b.entries()])
  })

  it('assigns theMarked a Foundation target when theMarked is in play', () => {
    for (let seed = 0; seed < 50; seed++) {
      const assignments = assignRoles(players, ALL_ROLE_IDS, seededRng(seed))
      const marked = [...assignments.values()].find((a) => a.role === 'theMarked')
      if (marked) {
        expect(marked.markedTargetUid).not.toBeNull()
        const target = assignments.get(marked.markedTargetUid!)
        expect(target?.faction).toBe('foundation')
      }
    }
  })

  it('throws when the enabled pool has no CI role', () => {
    const pool = ALL_ROLE_IDS.filter((r) => ROLE_DEFINITIONS[r].faction !== 'ci')
    expect(() => assignRoles(players, pool, seededRng(1))).toThrow(/Chaos Insurgency/)
  })

  it("throws when the enabled pool has no Serpent's Hand role", () => {
    const pool = ALL_ROLE_IDS.filter((r) => ROLE_DEFINITIONS[r].faction !== 'serpentsHand')
    expect(() => assignRoles(players, pool, seededRng(1))).toThrow(/Serpent's Hand/)
  })

  it('throws when the pool is smaller than the player count', () => {
    expect(() => assignRoles(players, ['agent', 'infiltrator'], seededRng(1))).toThrow(/smaller than player count/)
  })

  // ADR-0002 invariants, checked across many seeds and player counts. "Majority" is a
  // plurality (Foundation outnumbers CI and outnumbers Serpent's Hand individually), not a
  // strict >50% of all players — see the comment on assignRoles for why.
  it('always satisfies Foundation-plurality / >=1 CI / >=1 Serpent\'s Hand across many random seeds', () => {
    for (const n of [4, 5, 6]) {
      const subset = players.slice(0, n)
      for (let seed = 0; seed < 200; seed++) {
        const assignments = assignRoles(subset, ALL_ROLE_IDS, seededRng(seed * 31 + n))
        const factions = [...assignments.values()].map((a) => a.faction)
        const foundationCount = factions.filter((f) => f === 'foundation').length
        const ciCount = factions.filter((f) => f === 'ci').length
        const shCount = factions.filter((f) => f === 'serpentsHand').length

        expect(foundationCount).toBeGreaterThan(ciCount)
        expect(foundationCount).toBeGreaterThan(shCount)
        expect(ciCount).toBeGreaterThanOrEqual(1)
        expect(shCount).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('throws a clear error for a player count too small to give a Foundation plurality', () => {
    expect(() => assignRoles(['p1', 'p2', 'p3'], ALL_ROLE_IDS, seededRng(1))).toThrow(/cannot form a Foundation plurality/)
  })
})
