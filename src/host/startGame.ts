import { assignRoles } from '../game/roleAssignment'
import { updateLobby } from '../firebase/repository/lobbyRepository'
import { writeSecretRoles } from '../firebase/repository/gameplayRepository'
import type { RoleId } from '../game/types'

/** Host-triggered: randomizes roles (ADR-0002 invariants) and moves the lobby into play. */
export async function startGame(lobbyId: string, playerUids: string[], enabledRoles: RoleId[]): Promise<void> {
  const assignments = assignRoles(playerUids, enabledRoles, Math.random)
  await writeSecretRoles(lobbyId, assignments)
  await updateLobby(lobbyId, {
    status: 'in_progress',
    phase: 'night',
    cycle: 1,
    phaseDeadline: null,
    winner: null,
  })
}
