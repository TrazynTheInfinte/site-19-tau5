import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config'
import type { LobbyDoc, PlayerDoc } from '../schema'
import { ALL_ROLE_IDS, type RoleId } from '../../game/types'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars

function generateCode(length = 5): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

function lobbyDocRef(lobbyId: string) {
  return doc(db, 'lobbies', lobbyId)
}

function playerDocRef(lobbyId: string, uid: string) {
  return doc(db, 'lobbies', lobbyId, 'players', uid)
}

export const DEFAULT_CYCLE_CAP = 4

/** Creates a lobby and its host player doc. Returns the lobby's join code (== its doc id). */
export async function createLobby(hostUid: string, hostDisplayName: string): Promise<string> {
  let code = generateCode()
  // Extremely unlikely to collide at this scale, but check once to be safe.
  const existing = await getDoc(lobbyDocRef(code))
  if (existing.exists()) code = generateCode()

  const lobby: LobbyDoc = {
    code,
    hostUid,
    hostLastSeen: Date.now(),
    status: 'lobby',
    phase: 'lobby',
    cycle: 0,
    cycleCap: DEFAULT_CYCLE_CAP,
    phaseDeadline: null,
    rolePoolSelection: ALL_ROLE_IDS,
    winner: null,
    personalWinners: [],
    createdAt: Date.now(),
  }
  await setDoc(lobbyDocRef(code), lobby)

  const player: PlayerDoc = {
    displayName: hostDisplayName,
    connected: true,
    lastSeen: Date.now(),
    alive: true,
    isHost: true,
    eliminatedCycle: null,
  }
  await setDoc(playerDocRef(code, hostUid), player)

  return code
}

export async function joinLobby(code: string, uid: string, displayName: string): Promise<void> {
  const lobbySnap = await getDoc(lobbyDocRef(code))
  if (!lobbySnap.exists()) throw new Error('Lobby not found')
  if (lobbySnap.data().status !== 'lobby') throw new Error('Game already started')

  const player: PlayerDoc = {
    displayName,
    connected: true,
    lastSeen: Date.now(),
    alive: true,
    isHost: false,
    eliminatedCycle: null,
  }
  await setDoc(playerDocRef(code, uid), player, { merge: true })
}

/** Rejoin: mark presence back on for a player who already has a doc in this lobby. */
export async function rejoinLobby(code: string, uid: string): Promise<void> {
  await updateDoc(playerDocRef(code, uid), { connected: true, lastSeen: Date.now() })
}

export function subscribeLobby(lobbyId: string, cb: (lobby: LobbyDoc | null) => void): Unsubscribe {
  return onSnapshot(lobbyDocRef(lobbyId), (snap) => {
    cb(snap.exists() ? (snap.data() as LobbyDoc) : null)
  })
}

export function subscribePlayers(lobbyId: string, cb: (players: (PlayerDoc & { uid: string })[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'lobbies', lobbyId, 'players'), (snap) => {
    cb(snap.docs.map((d) => ({ ...(d.data() as PlayerDoc), uid: d.id })))
  })
}

export async function setPlayerConnected(lobbyId: string, uid: string, connected: boolean): Promise<void> {
  await updateDoc(playerDocRef(lobbyId, uid), { connected, lastSeen: Date.now() })
}

export async function kickPlayer(lobbyId: string, uid: string): Promise<void> {
  await updateDoc(playerDocRef(lobbyId, uid), { connected: false })
}

export async function setRolePoolSelection(lobbyId: string, roles: RoleId[]): Promise<void> {
  await updateDoc(lobbyDocRef(lobbyId), { rolePoolSelection: roles })
}

export async function updateLobby(lobbyId: string, patch: Partial<LobbyDoc>): Promise<void> {
  await updateDoc(lobbyDocRef(lobbyId), patch)
}

export async function addPersonalWinners(lobbyId: string, uids: string[]): Promise<void> {
  if (uids.length === 0) return
  await updateDoc(lobbyDocRef(lobbyId), { personalWinners: arrayUnion(...uids) })
}

export async function heartbeatHost(lobbyId: string, hostUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(lobbyDocRef(lobbyId))
    if (!snap.exists()) return
    const lobby = snap.data() as LobbyDoc
    if (lobby.hostUid !== hostUid) return
    tx.update(lobbyDocRef(lobbyId), { hostLastSeen: Date.now() })
  })
}

const HOST_STALE_MS = 20_000

/** Any connected client can call this; it only succeeds if the current host is actually stale. */
export async function claimHost(lobbyId: string, newHostUid: string): Promise<boolean> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(lobbyDocRef(lobbyId))
    if (!snap.exists()) return false
    const lobby = snap.data() as LobbyDoc
    if (Date.now() - lobby.hostLastSeen < HOST_STALE_MS) return false
    tx.update(lobbyDocRef(lobbyId), { hostUid: newHostUid, hostLastSeen: Date.now() })
    tx.update(playerDocRef(lobbyId, newHostUid), { isHost: true })
    tx.update(playerDocRef(lobbyId, lobby.hostUid), { isHost: false })
    return true
  })
}

export { HOST_STALE_MS }
export type { LobbyDoc, PlayerDoc }
