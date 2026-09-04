import type { InvestigateResult, NightAction, NightResolutionResult, RoleAssignments } from './types'

/**
 * Resolves a night's submitted actions per CONTEXT.md's order: (1) disabling effects
 * (block) resolve first and remove the blocked actor's action entirely, (2) protection
 * beats a kill on the same target, (3) passive/read-only effects (investigate) resolve
 * last and are only affected by the actor themself having been blocked in step 1.
 */
export function resolveNight(actions: NightAction[], roles: RoleAssignments): NightResolutionResult {
  const blockActions = actions.filter((a) => a.actionType === 'block')
  const disabledActorUids = new Set<string>()
  for (const block of blockActions) {
    disabledActorUids.add(block.targetUid)
  }

  const activeActions = actions.filter((a) => !disabledActorUids.has(a.actorUid))

  const protectTargets = new Set(activeActions.filter((a) => a.actionType === 'protect').map((a) => a.targetUid))
  const killActions = activeActions.filter((a) => a.actionType === 'kill')
  const surviving = killActions.filter((a) => !protectTargets.has(a.targetUid))
  const eliminatedUid = surviving.length > 0 ? surviving[0].targetUid : null

  const investigationResults: InvestigateResult[] = activeActions
    .filter((a) => a.actionType === 'investigate')
    .map((a) => {
      const targetRole = roles.get(a.targetUid)
      return {
        type: 'investigate' as const,
        actorUid: a.actorUid,
        targetUid: a.targetUid,
        targetFaction: targetRole ? targetRole.faction : 'foundation',
      }
    })

  return {
    eliminatedUid,
    disabledActorUids: [...disabledActorUids],
    investigationResults,
  }
}
