import type { InvestigateResult, NightAction, NightResolutionResult, RoleAssignments, TrackResult } from './types'

/**
 * Resolves a night's submitted actions. Order of operations:
 * 0. Cartographer swaps apply first (silently, to a working copy) - two other players' actions
 *    get their targets swapped before anything else is evaluated, so every downstream step
 *    naturally sees the swapped targets without needing special-casing.
 * 1. Disabling effects (block, and detain - which disables like a block) resolve next and
 *    remove the disabled actor's action from consideration entirely.
 * 2. Protection (protect, and detain - which also protects like a Medical Officer) beats a
 *    normal kill on the same target. A bypass-kill (Warden's execute, Anomaly's trueKill)
 *    ignores protection entirely and takes priority if both would otherwise land, since it's
 *    a once-per-game, deliberately unstoppable effect.
 * 3. Passive/read-only effects (investigate, track) resolve last. Investigate reports a
 *    framed target's faction as 'ci' regardless of their real faction. Both are unaffected by
 *    anything else unless the actor themself was disabled in step 1.
 */
export function resolveNight(rawActions: NightAction[], roles: RoleAssignments): NightResolutionResult {
  const actions = applyCartographerSwaps(rawActions)

  const originalActorUids = new Set(rawActions.map((a) => a.actorUid))

  const disabledActorUids = new Set<string>()
  for (const a of actions) {
    if (a.actionType === 'block' || a.actionType === 'detain') disabledActorUids.add(a.targetUid)
  }

  const activeActions = actions.filter((a) => !disabledActorUids.has(a.actorUid))

  const protectTargets = new Set(
    activeActions.filter((a) => a.actionType === 'protect' || a.actionType === 'detain').map((a) => a.targetUid),
  )
  const frameTargets = new Set(activeActions.filter((a) => a.actionType === 'frame').map((a) => a.targetUid))

  const bypassKill = activeActions.find((a) => a.actionType === 'execute' || a.actionType === 'trueKill')
  const normalKill = activeActions.find((a) => a.actionType === 'kill' && !protectTargets.has(a.targetUid))
  const eliminatedUid = bypassKill ? bypassKill.targetUid : normalKill ? normalKill.targetUid : null

  const investigationResults: InvestigateResult[] = activeActions
    .filter((a) => a.actionType === 'investigate')
    .map((a) => {
      const targetRole = roles.get(a.targetUid)
      const realFaction = targetRole ? targetRole.faction : 'foundation'
      return {
        type: 'investigate' as const,
        actorUid: a.actorUid,
        targetUid: a.targetUid,
        targetFaction: frameTargets.has(a.targetUid) ? 'ci' : realFaction,
      }
    })

  const trackResults: TrackResult[] = activeActions
    .filter((a) => a.actionType === 'track')
    .map((a) => ({
      type: 'track' as const,
      actorUid: a.actorUid,
      targetUid: a.targetUid,
      acted: originalActorUids.has(a.targetUid),
    }))

  return {
    eliminatedUid,
    disabledActorUids: [...disabledActorUids],
    investigationResults,
    trackResults,
  }
}

function applyCartographerSwaps(actions: NightAction[]): NightAction[] {
  const swaps = actions.filter((a) => a.actionType === 'cartographerSwap' && a.secondaryTargetUid)
  if (swaps.length === 0) return actions

  const working = actions.map((a) => ({ ...a }))
  for (const swap of swaps) {
    const a = working.find((x) => x.actorUid === swap.targetUid && x.actionType !== 'cartographerSwap')
    const b = working.find((x) => x.actorUid === swap.secondaryTargetUid && x.actionType !== 'cartographerSwap')
    if (a && b) {
      const aTarget = a.targetUid
      a.targetUid = b.targetUid
      b.targetUid = aTarget
    }
  }
  return working
}
