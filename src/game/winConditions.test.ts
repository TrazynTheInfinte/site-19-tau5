import { describe, expect, it } from 'vitest'
import { checkFactionWin, checkPersonalWins, checkSeedWins, checkSurviveToEndWins } from './winConditions'
import { makeRole } from './testRoleHelpers'
import type { PlayerState, RoleAssignments } from './types'

function makePlayers(uids: string[], deadUids: string[] = []): PlayerState[] {
  return uids.map((uid) => ({ uid, displayName: uid, alive: !deadUids.includes(uid), eliminatedCycle: null }))
}

const roles: RoleAssignments = new Map(
  [
    makeRole('f1', 'agent'),
    makeRole('f2', 'researcher'),
    makeRole('ci1', 'infiltrator'),
    makeRole('sh1', 'theFool'),
    makeRole('sh2', 'theMarked', { markedTargetUid: 'f1' }),
  ].map((r) => [r.uid, r]),
)

describe('checkFactionWin', () => {
  it('Foundation wins once all CI are eliminated', () => {
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh1', 'sh2'], ['ci1'])
    expect(checkFactionWin(players, roles)).toBe('foundation')
  })

  it('CI wins when living CI outnumbers living Foundation', () => {
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh1', 'sh2'], ['f1', 'f2'])
    expect(checkFactionWin(players, roles)).toBe('ci')
  })

  it("Serpent's Hand deaths do not affect the CI-vs-Foundation comparison (ADR-0001)", () => {
    // 1 CI vs 1 Foundation living, both Serpent's Hand dead: not CI's win (1 is not > 1)
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh1', 'sh2'], ['f2', 'sh1', 'sh2'])
    expect(checkFactionWin(players, roles)).toBeNull()
  })

  it('no winner while CI is present and does not outnumber Foundation', () => {
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh1', 'sh2'])
    expect(checkFactionWin(players, roles)).toBeNull()
  })
})

describe('checkPersonalWins', () => {
  it('The Fool wins when voted out', () => {
    const wins = checkPersonalWins({ uid: 'sh1', cause: 'vote', cycle: 1 }, roles)
    expect(wins).toEqual([{ uid: 'sh1', role: 'theFool' }])
  })

  it('The Fool does NOT win from a night kill', () => {
    const wins = checkPersonalWins({ uid: 'sh1', cause: 'kill', cycle: 1 }, roles)
    expect(wins).toEqual([])
  })

  it("The Marked wins when their target is eliminated, by either cause", () => {
    expect(checkPersonalWins({ uid: 'f1', cause: 'vote', cycle: 1 }, roles)).toEqual([
      { uid: 'sh2', role: 'theMarked' },
    ])
    expect(checkPersonalWins({ uid: 'f1', cause: 'kill', cycle: 1 }, roles)).toEqual([
      { uid: 'sh2', role: 'theMarked' },
    ])
  })

  it('no personal win when the eliminated player matches nobody\'s condition', () => {
    expect(checkPersonalWins({ uid: 'f2', cause: 'vote', cycle: 1 }, roles)).toEqual([])
  })
})

describe('checkSurviveToEndWins', () => {
  const survivorRoles: RoleAssignments = new Map([
    ...roles,
    ['sh3', makeRole('sh3', 'puppeteer')],
    ['sh4', makeRole('sh4', 'cartographer')],
  ])

  it('Puppeteer and Cartographer win if still alive when the game ends', () => {
    const players = makePlayers(['f1', 'sh3', 'sh4'])
    expect(checkSurviveToEndWins(players, survivorRoles)).toEqual([
      { uid: 'sh3', role: 'puppeteer' },
      { uid: 'sh4', role: 'cartographer' },
    ])
  })

  it('does not win if eliminated before the game ends', () => {
    const players = makePlayers(['f1', 'sh3', 'sh4'], ['sh3'])
    expect(checkSurviveToEndWins(players, survivorRoles)).toEqual([{ uid: 'sh4', role: 'cartographer' }])
  })
})

describe('checkSeedWins', () => {
  const cultivatorRoles: RoleAssignments = new Map([
    ...roles,
    ['sh5', makeRole('sh5', 'cultivator', { seededUids: ['f1', 'f2'] })],
  ])

  it('wins once every seeded player is eliminated', () => {
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh5'], ['f1', 'f2'])
    expect(checkSeedWins(players, cultivatorRoles)).toEqual([{ uid: 'sh5', role: 'cultivator' }])
  })

  it('does not win while any seeded player is still alive', () => {
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh5'], ['f1'])
    expect(checkSeedWins(players, cultivatorRoles)).toEqual([])
  })

  it('does not win before the seed set is fully assigned', () => {
    const partial: RoleAssignments = new Map([...roles, ['sh6', makeRole('sh6', 'cultivator', { seededUids: ['f1'] })]])
    const players = makePlayers(['f1', 'f2', 'ci1', 'sh6'], ['f1'])
    expect(checkSeedWins(players, partial)).toEqual([])
  })
})
