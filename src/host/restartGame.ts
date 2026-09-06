import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { resetGameplayData } from '../firebase/repository/gameplayRepository'
import { updateLobby } from '../firebase/repository/lobbyRepository'

/** Host-triggered from the end screen: wipes the finished game's data and returns everyone
 * still in the roster to the pre-game lobby, alive, to play again with the same group. */
export async function restartGame(lobbyId: string, playerUids: string[]): Promise<void> {
  await resetGameplayData(lobbyId)

  try {
    const batch = writeBatch(db)
    for (const uid of playerUids) {
      batch.update(doc(db, 'lobbies', lobbyId, 'players', uid), { alive: true, eliminatedCycle: null })
    }
    await batch.commit()
  } catch (e) {
    throw new Error(`restartGame: resetting player alive states failed - ${e instanceof Error ? e.message : e}`)
  }

  try {
    await updateLobby(lobbyId, {
      status: 'lobby',
      phase: 'lobby',
      cycle: 0,
      phaseDeadline: null,
      winner: null,
      personalWinners: [],
      tomeHolderUid: null,
      showdown: null,
    })
  } catch (e) {
    throw new Error(`restartGame: updating lobby doc failed - ${e instanceof Error ? e.message : e}`)
  }
}
