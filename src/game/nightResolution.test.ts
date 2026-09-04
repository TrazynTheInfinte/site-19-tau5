import { describe, expect, it } from 'vitest'
import { resolveNight } from './nightResolution'
import type { NightAction, RoleAssignment, RoleAssignments } from './types'

const roleEntries: RoleAssignment[] = [
  { uid: 'agent1', role: 'agent', faction: 'foundation', markedTargetUid: null, saboteurUsed: false },
  { uid: 'researcher1', role: 'researcher', faction: 'foundation', markedTargetUid: null, saboteurUsed: false },
  { uid: 'medic1', role: 'medicalOfficer', faction: 'foundation', markedTargetUid: null, saboteurUsed: false },
  { uid: 'infiltrator1', role: 'infiltrator', faction: 'ci', markedTargetUid: null, saboteurUsed: false },
  { uid: 'saboteur1', role: 'saboteur', faction: 'ci', markedTargetUid: null, saboteurUsed: false },
]

const baseRoles: RoleAssignments = new Map(roleEntries.map((r) => [r.uid, r]))

describe('resolveNight', () => {
  it('kills the target when nobody protects or blocks', () => {
    const actions: NightAction[] = [{ cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'agent1' }]
    const result = resolveNight(actions, baseRoles)
    expect(result.eliminatedUid).toBe('agent1')
    expect(result.disabledActorUids).toEqual([])
  })

  it("Medical Officer's protection beats the Infiltrator's kill on the same target", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.eliminatedUid).toBeNull()
  })

  it("Saboteur's block negates the blocked player's action entirely", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'saboteur1', actionType: 'block', targetUid: 'medic1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.disabledActorUids).toEqual(['medic1'])
    // medic's protect never fires because medic was blocked, so the kill goes through
    expect(result.eliminatedUid).toBe('agent1')
  })

  it("blocking the Infiltrator negates the kill even with no protection", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'saboteur1', actionType: 'block', targetUid: 'infiltrator1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.disabledActorUids).toEqual(['infiltrator1'])
    expect(result.eliminatedUid).toBeNull()
  })

  it('Researcher investigation resolves and reports the target faction, unaffected by other actions', () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'researcher1', actionType: 'investigate', targetUid: 'infiltrator1' },
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.investigationResults).toEqual([
      { type: 'investigate', actorUid: 'researcher1', targetUid: 'infiltrator1', targetFaction: 'ci' },
    ])
  })

  it('Researcher investigation does not fire if the Researcher themself was blocked', () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'researcher1', actionType: 'investigate', targetUid: 'infiltrator1' },
      { cycle: 1, actorUid: 'saboteur1', actionType: 'block', targetUid: 'researcher1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.investigationResults).toEqual([])
    expect(result.disabledActorUids).toEqual(['researcher1'])
  })
})
