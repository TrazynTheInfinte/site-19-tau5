import { describe, expect, it } from 'vitest'
import { resolveNight } from './nightResolution'
import type { NightAction, RoleAssignment, RoleAssignments } from './types'

const roleEntries: RoleAssignment[] = [
  { uid: 'agent1', role: 'agent', faction: 'foundation', markedTargetUid: null, saboteurUsed: false, specialUsed: false },
  {
    uid: 'researcher1',
    role: 'researcher',
    faction: 'foundation',
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
  },
  {
    uid: 'medic1',
    role: 'medicalOfficer',
    faction: 'foundation',
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
  },
  {
    uid: 'tracker1',
    role: 'tracker',
    faction: 'foundation',
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
  },
  {
    uid: 'warden1',
    role: 'warden',
    faction: 'foundation',
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
  },
  {
    uid: 'infiltrator1',
    role: 'infiltrator',
    faction: 'ci',
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
  },
  { uid: 'saboteur1', role: 'saboteur', faction: 'ci', markedTargetUid: null, saboteurUsed: false, specialUsed: false },
  { uid: 'framer1', role: 'framer', faction: 'ci', markedTargetUid: null, saboteurUsed: false, specialUsed: false },
  { uid: 'anomaly1', role: 'anomaly', faction: 'ci', markedTargetUid: null, saboteurUsed: false, specialUsed: false },
  {
    uid: 'cartographer1',
    role: 'cartographer',
    faction: 'serpentsHand',
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
  },
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

  it('blocking the Infiltrator negates the kill even with no protection', () => {
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

  it("Warden's detain both blocks the target's action and protects them from a kill", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'medic1' },
      { cycle: 1, actorUid: 'warden1', actionType: 'detain', targetUid: 'medic1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.disabledActorUids).toEqual(['medic1']) // medic's own protect never fires
    expect(result.eliminatedUid).toBeNull() // but medic themself was protected by the detain
  })

  it("Warden's execute bypasses protection entirely", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'warden1', actionType: 'execute', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.eliminatedUid).toBe('agent1')
  })

  it("Anomaly's trueKill also bypasses protection", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'anomaly1', actionType: 'trueKill', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.eliminatedUid).toBe('agent1')
  })

  it("Framer makes the target appear as CI to a Researcher's investigation that cycle", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'framer1', actionType: 'frame', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'researcher1', actionType: 'investigate', targetUid: 'agent1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.investigationResults).toEqual([
      { type: 'investigate', actorUid: 'researcher1', targetUid: 'agent1', targetFaction: 'ci' },
    ])
  })

  it('the Tome holder reads as Foundation to investigation regardless of their real faction', () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'researcher1', actionType: 'investigate', targetUid: 'infiltrator1' },
    ]
    const result = resolveNight(actions, baseRoles, 'infiltrator1')
    expect(result.investigationResults).toEqual([
      { type: 'investigate', actorUid: 'researcher1', targetUid: 'infiltrator1', targetFaction: 'foundation' },
    ])
  })

  it('Tracker learns whether the target submitted any action this cycle', () => {
    const actedActions: NightAction[] = [
      { cycle: 1, actorUid: 'tracker1', actionType: 'track', targetUid: 'infiltrator1' },
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'agent1' },
    ]
    expect(resolveNight(actedActions, baseRoles).trackResults).toEqual([
      { type: 'track', actorUid: 'tracker1', targetUid: 'infiltrator1', acted: true },
    ])

    const idleActions: NightAction[] = [{ cycle: 1, actorUid: 'tracker1', actionType: 'track', targetUid: 'agent1' }]
    expect(resolveNight(idleActions, baseRoles).trackResults).toEqual([
      { type: 'track', actorUid: 'tracker1', targetUid: 'agent1', acted: false },
    ])
  })

  it("Tracker still reports 'acted: true' even if the target's action was blocked", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'tracker1', actionType: 'track', targetUid: 'medic1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
      { cycle: 1, actorUid: 'saboteur1', actionType: 'block', targetUid: 'medic1' },
    ]
    const result = resolveNight(actions, baseRoles)
    expect(result.trackResults).toEqual([{ type: 'track', actorUid: 'tracker1', targetUid: 'medic1', acted: true }])
  })

  it("Cartographer's swap silently redirects two other players' targets before resolution", () => {
    const actions: NightAction[] = [
      { cycle: 1, actorUid: 'infiltrator1', actionType: 'kill', targetUid: 'medic1' },
      { cycle: 1, actorUid: 'medic1', actionType: 'protect', targetUid: 'agent1' },
      {
        cycle: 1,
        actorUid: 'cartographer1',
        actionType: 'cartographerSwap',
        targetUid: 'infiltrator1',
        secondaryTargetUid: 'medic1',
      },
    ]
    // Infiltrator's kill target and Medic's protect target get swapped: Infiltrator now
    // effectively targets 'agent1' (medic's old target) and Medic effectively protects
    // 'medic1' (infiltrator's old target) - so the infiltrator's kill lands on agent1, unprotected.
    const result = resolveNight(actions, baseRoles)
    expect(result.eliminatedUid).toBe('agent1')
  })
})
