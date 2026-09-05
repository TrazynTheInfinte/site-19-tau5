import { assignRoles } from '../game/roleAssignment'
import { updateLobby } from '../firebase/repository/lobbyRepository'
import { writeSecretRoles } from '../firebase/repository/gameplayRepository'
import { DAY_PHASE_DURATION_MS } from '../game/constants'
import type { RoleId } from '../game/types'

/** Host-triggered: randomizes roles (ADR-0002 invariants) and moves the lobby into play. */
export async function startGame(lobbyId: string, playerUids: string[], enabledRoles: RoleId[]): Promise<void> {
  const assignments = assignRoles(playerUids, enabledRoles, Math.random)
  await writeSecretRoles(lobbyId, assignments)

  // The Tome starts with the Infiltrator (closest thing this game has to a "Coven Leader"),
  // or a random CI member if there's no Infiltrator in the pool this game.
  const ciAssignments = [...assignments.values()].filter((a) => a.faction === 'ci')
  const infiltrator = ciAssignments.find((a) => a.role === 'infiltrator')
  const initialHolder = infiltrator?.uid ?? (ciAssignments.length > 0 ? ciAssignments[0].uid : null)

  // Starts on a talk-only briefing (cycle 0) instead of straight into Night 1, so players get
  // a chance to introduce characters/set the scene before anyone can act or be voted on.
  await updateLobby(lobbyId, {
    status: 'in_progress',
    phase: 'briefing',
    cycle: 0,
    phaseDeadline: Date.now() + DAY_PHASE_DURATION_MS,
    winner: null,
    tomeHolderUid: initialHolder,
  })
}
