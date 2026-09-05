import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { assignRoles } from '../game/roleAssignment'
import { updateLobby } from '../firebase/repository/lobbyRepository'
import { writeSecretRoles } from '../firebase/repository/gameplayRepository'
import { BRIEFING_DURATION_MS } from '../game/constants'
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

  // Reset in case this is a rematch (restartGame reuses existing player docs).
  const batch = writeBatch(db)
  for (const uid of playerUids) {
    batch.update(doc(db, 'lobbies', lobbyId, 'players', uid), { briefingReady: false })
  }
  await batch.commit()

  // Starts on a talk-only briefing (cycle 0) instead of straight into Night 1, so players get
  // a chance to introduce characters/set the scene before anyone can act or be voted on. Ends
  // on whichever comes first: the 1-minute timer, or everyone clicking ready.
  await updateLobby(lobbyId, {
    status: 'in_progress',
    phase: 'briefing',
    cycle: 0,
    phaseDeadline: Date.now() + BRIEFING_DURATION_MS,
    winner: null,
    tomeHolderUid: initialHolder,
  })
}
