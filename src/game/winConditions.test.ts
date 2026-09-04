import { describe, expect, it } from 'vitest'
import { checkFactionWin, checkPersonalWins } from './winConditions'
import type { PlayerState, RoleAssignments } from './types'

function makePlayers(uids: string[], deadUids: string[] = []): PlayerState[] {
  return uids.map((uid) => ({ uid, displayName: uid, alive: !deadUids.includes(uid), eliminatedCycle: null }))
}

const roles: RoleAssignments = new Map([
  ['f1', { uid: 'f1', role: 'agent', faction: 'foundation', markedTargetUid: null, saboteurUsed: false }],
  ['f2', { uid: 'f2', role: 'researcher', faction: 'foundation', markedTargetUid: null, saboteurUsed: false }],
  ['ci1', { uid: 'ci1', role: 'infiltrator', faction: 'ci', markedTargetUid: null, saboteurUsed: false }],
  ['sh1', { uid: 'sh1', role: 'theFool', faction: 'serpentsHand', markedTargetUid: null, saboteurUsed: false }],
  ['sh2', { uid: 'sh2', role: 'theMarked', faction: 'serpentsHand', markedTargetUid: 'f1', saboteurUsed: false }],
])

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
