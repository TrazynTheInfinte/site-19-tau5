import { describe, expect, it } from 'vitest'
import { checkShowdownTrigger, rollChamberPosition } from './showdown'
import { makeRole } from './testRoleHelpers'
import type { PlayerState } from './types'

function alive(uid: string): PlayerState {
  return { uid, displayName: uid, alive: true, eliminatedCycle: null }
}

describe('checkShowdownTrigger', () => {
  it('triggers when the last two are the Enforcer and a CI member', () => {
    const players = [alive('a'), alive('b')]
    const roles = new Map([
      ['a', makeRole('a', 'enforcer')],
      ['b', makeRole('b', 'saboteur')],
    ])
    expect(checkShowdownTrigger(players, roles)).toEqual({ enforcerUid: 'a', ciUid: 'b' })
  })

  it('triggers regardless of which of the two is listed first', () => {
    const players = [alive('a'), alive('b')]
    const roles = new Map([
      ['a', makeRole('a', 'whisperer')],
      ['b', makeRole('b', 'enforcer')],
    ])
    expect(checkShowdownTrigger(players, roles)).toEqual({ enforcerUid: 'b', ciUid: 'a' })
  })

  it('does not trigger for Enforcer + Serpent\'s Hand', () => {
    const players = [alive('a'), alive('b')]
    const roles = new Map([
      ['a', makeRole('a', 'enforcer')],
      ['b', makeRole('b', 'theFool')],
    ])
    expect(checkShowdownTrigger(players, roles)).toBeNull()
  })

  it('does not trigger for two Foundation members', () => {
    const players = [alive('a'), alive('b')]
    const roles = new Map([
      ['a', makeRole('a', 'agent')],
      ['b', makeRole('b', 'researcher')],
    ])
    expect(checkShowdownTrigger(players, roles)).toBeNull()
  })

  it('does not trigger with more than two living players', () => {
    const players = [alive('a'), alive('b'), alive('c')]
    const roles = new Map([
      ['a', makeRole('a', 'enforcer')],
      ['b', makeRole('b', 'saboteur')],
      ['c', makeRole('c', 'agent')],
    ])
    expect(checkShowdownTrigger(players, roles)).toBeNull()
  })

  it('ignores eliminated players when counting who is alive', () => {
    const players = [alive('a'), alive('b'), { uid: 'c', displayName: 'c', alive: false, eliminatedCycle: 1 }]
    const roles = new Map([
      ['a', makeRole('a', 'enforcer')],
      ['b', makeRole('b', 'infiltrator')],
      ['c', makeRole('c', 'agent')],
    ])
    expect(checkShowdownTrigger(players, roles)).toEqual({ enforcerUid: 'a', ciUid: 'b' })
  })

  it('triggers even if the Enforcer\'s gun is jammed', () => {
    const players = [alive('a'), alive('b')]
    const roles = new Map([
      ['a', makeRole('a', 'enforcer', { gunJammed: true })],
      ['b', makeRole('b', 'framer')],
    ])
    expect(checkShowdownTrigger(players, roles)).toEqual({ enforcerUid: 'a', ciUid: 'b' })
  })
})

describe('rollChamberPosition', () => {
  it('returns a value from 1 to 6 inclusive', () => {
    for (let i = 0; i < 20; i++) {
      const position = rollChamberPosition()
      expect(position).toBeGreaterThanOrEqual(1)
      expect(position).toBeLessThanOrEqual(6)
    }
  })

  it('uses the injected rng deterministically', () => {
    expect(rollChamberPosition(() => 0)).toBe(1)
    expect(rollChamberPosition(() => 0.999)).toBe(6)
  })
})
