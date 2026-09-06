import { ROLE_DEFINITIONS, type RoleAssignment, type RoleId } from './types'

/** Test-only helper: builds a RoleAssignment with sensible defaults, so adding a new field to
 * the shape doesn't require touching every literal across every test file. */
export function makeRole(uid: string, role: RoleId, overrides: Partial<RoleAssignment> = {}): RoleAssignment {
  return {
    uid,
    role,
    faction: ROLE_DEFINITIONS[role].faction,
    markedTargetUid: null,
    saboteurUsed: false,
    specialUsed: false,
    bulletsLoaded: 0,
    gunJammed: false,
    senseTargetUid: null,
    seededUids: [],
    ...overrides,
  }
}
