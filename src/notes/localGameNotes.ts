import type { Faction } from '../game/types'

/**
 * Personal deduction notes: a viewer's own suspicions and freeform notepad for a game.
 * Deliberately client-local (localStorage) rather than synced - these are private to the
 * viewer, nobody else should ever see them, and there's no reason to pay a Firestore write
 * for something only the local browser ever reads.
 *
 * Keyed by (lobbyCode, gameNumber, ...) rather than just lobbyCode: a restart reuses the same
 * lobby code for a brand new game, and there's no way for the host to reach into every other
 * player's browser to clear their old notes - incrementing gameNumber on restart (see
 * LobbyDoc.gameNumber) makes the previous game's keys simply go unused instead, with no
 * explicit clearing step needed.
 */

export type Suspicion = Faction | 'unknown'

function suspicionKey(lobbyCode: string, gameNumber: number, viewerUid: string, targetUid: string): string {
  return `site19_suspicion_${lobbyCode}_${gameNumber}_${viewerUid}_${targetUid}`
}

export function getSuspicion(lobbyCode: string, gameNumber: number, viewerUid: string, targetUid: string): Suspicion {
  const stored = localStorage.getItem(suspicionKey(lobbyCode, gameNumber, viewerUid, targetUid))
  if (stored === 'foundation' || stored === 'ci' || stored === 'serpentsHand') return stored
  return 'unknown'
}

export function setSuspicion(
  lobbyCode: string,
  gameNumber: number,
  viewerUid: string,
  targetUid: string,
  suspicion: Suspicion,
): void {
  const key = suspicionKey(lobbyCode, gameNumber, viewerUid, targetUid)
  if (suspicion === 'unknown') {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, suspicion)
  }
}

function notepadKey(lobbyCode: string, gameNumber: number, viewerUid: string): string {
  return `site19_notepad_${lobbyCode}_${gameNumber}_${viewerUid}`
}

export function getNotepad(lobbyCode: string, gameNumber: number, viewerUid: string): string {
  return localStorage.getItem(notepadKey(lobbyCode, gameNumber, viewerUid)) ?? ''
}

export function setNotepad(lobbyCode: string, gameNumber: number, viewerUid: string, text: string): void {
  localStorage.setItem(notepadKey(lobbyCode, gameNumber, viewerUid), text)
}
