import type { NightActionType, RoleId } from './types'

/**
 * The role's *required* night action, used only to determine who the resolver must wait
 * on before resolving a night (see resolver.ts's requiredNightActorUids). Roles with an
 * optional once-per-game ability (Anomaly, Cartographer) return null here even though they
 * can sometimes act, since they're never required to. Warden always returns 'detain' as the
 * representative required type even though they may submit 'execute' instead on a given
 * night — the required-actor check only cares that *some* action was submitted.
 *
 * Infiltrator has no innate ability here (returns null) - killing is exclusively the Tome
 * holder's privilege now, for every CI role including Infiltrator. requiredNightActorUids
 * separately treats the current Tome holder as required to act even when their role alone
 * returns null here.
 */
export function nightAbilityFor(role: RoleId): NightActionType | null {
  switch (role) {
    case 'researcher':
      return 'investigate'
    case 'medicalOfficer':
      return 'protect'
    case 'saboteur':
      return 'block'
    case 'tracker':
      return 'track'
    case 'warden':
      return 'detain'
    case 'framer':
      return 'frame'
    default:
      return null
  }
}
