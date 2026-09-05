import type { Faction } from '../game/types'

/**
 * Personal deduction notes: a viewer's own suspicions and freeform notepad for a game.
 * Deliberately client-local (localStorage) rather than synced - these are private to the
 * viewer, nobody else should ever see them, and there's no reason to pay a Firestore write
 * for something only the local browser ever reads.
 */

export type Suspicion = Faction | 'unknown'

function suspicionKey(lobbyCode: string, viewerUid: string, targetUid: string): string {
  return `site19_suspicion_${lobbyCode}_${viewerUid}_${targetUid}`
}

export function getSuspicion(lobbyCode: string, viewerUid: string, targetUid: string): Suspicion {
  const stored = localStorage.getItem(suspicionKey(lobbyCode, viewerUid, targetUid))
  if (stored === 'foundation' || stored === 'ci' || stored === 'serpentsHand') return stored
  return 'unknown'
}

export function setSuspicion(lobbyCode: string, viewerUid: string, targetUid: string, suspicion: Suspicion): void {
  if (suspicion === 'unknown') {
    localStorage.removeItem(suspicionKey(lobbyCode, viewerUid, targetUid))
  } else {
    localStorage.setItem(suspicionKey(lobbyCode, viewerUid, targetUid), suspicion)
  }
}

function notepadKey(lobbyCode: string, viewerUid: string): string {
  return `site19_notepad_${lobbyCode}_${viewerUid}`
}

export function getNotepad(lobbyCode: string, viewerUid: string): string {
  return localStorage.getItem(notepadKey(lobbyCode, viewerUid)) ?? ''
}

export function setNotepad(lobbyCode: string, viewerUid: string, text: string): void {
  localStorage.setItem(notepadKey(lobbyCode, viewerUid), text)
}
