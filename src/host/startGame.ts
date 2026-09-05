import { assignRoles } from '../game/roleAssignment'
import { updateLobby } from '../firebase/repository/lobbyRepository'
import { writeSecretRoles } from '../firebase/repository/gameplayRepository'
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

  await updateLobby(lobbyId, {
    status: 'in_progress',
    phase: 'night',
    cycle: 1,
    phaseDeadline: null,
    winner: null,
    tomeHolderUid: initialHolder,
  })
}
