import type { NightActionType, RoleId } from './types'

/** null means the role has no night action (Agent, The Fool, The Marked). */
export function nightAbilityFor(role: RoleId): NightActionType | null {
  switch (role) {
    case 'researcher':
      return 'investigate'
    case 'medicalOfficer':
      return 'protect'
    case 'infiltrator':
      return 'kill'
    case 'saboteur':
      return 'block'
    default:
      return null
  }
}
