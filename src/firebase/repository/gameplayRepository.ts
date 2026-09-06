import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config'
import type {
  DayChatDoc,
  GhostTipDoc,
  NightActionDoc,
  NightResultDoc,
  PublicCycleLogDoc,
  PuppeteerOverrideDoc,
  SecretRoleDoc,
  TomeTransferDoc,
  VoteDoc,
  WhisperDoc,
  WillDoc,
} from '../schema'
import { cycleDocId } from '../schema'
import type { RoleAssignments } from '../../game/types'

function col(lobbyId: string, name: string) {
  return collection(db, 'lobbies', lobbyId, name)
}

// 'secretRoles' must be deleted LAST: the whispers read rule does
// get(secretRoles/{self}).data.role == 'whisperer' to check the reader's own role, and reading
// a get()'d document's .data after it's already been deleted is a rules evaluation error (surfaces
// to the client as "Missing or insufficient permissions") - so every collection whose rules might
// depend on secretRoles existing has to be cleared while those docs are still there.
const GAMEPLAY_COLLECTIONS = [
  'nightActions',
  'nightResults',
  'votes',
  'publicCycleLog',
  'ghostTips',
  'wills',
  'puppeteerOverrides',
  'tomeTransfers',
  'dayChat',
  'whispers',
  'secretRoles',
] as const

/** Host-only: wipes all of a completed game's per-cycle/per-role data so a restart doesn't
 * collide with stale docs from the previous game (e.g. old cycle-1 votes would otherwise
 * look like already-submitted votes for the new game's cycle 1). */
export async function resetGameplayData(lobbyId: string): Promise<void> {
  for (const name of GAMEPLAY_COLLECTIONS) {
    const snap = await getDocs(col(lobbyId, name))
    if (snap.empty) continue
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

// ---- secretRoles ----

export async function writeSecretRoles(lobbyId: string, assignments: RoleAssignments): Promise<void> {
  const batch = writeBatch(db)
  for (const [uid, assignment] of assignments) {
    const roleDoc: SecretRoleDoc = {
      role: assignment.role,
      faction: assignment.faction,
      markedTargetUid: assignment.markedTargetUid,
      saboteurUsed: assignment.saboteurUsed,
      specialUsed: assignment.specialUsed,
      bulletsLoaded: assignment.bulletsLoaded,
      gunJammed: assignment.gunJammed,
      senseTargetUid: assignment.senseTargetUid,
      seededUids: assignment.seededUids,
    }
    batch.set(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), roleDoc)
  }
  await batch.commit()
}

export async function getMySecretRole(lobbyId: string, uid: string): Promise<SecretRoleDoc | null> {
  const snap = await getDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid))
  return snap.exists() ? (snap.data() as SecretRoleDoc) : null
}

export function subscribeMySecretRole(lobbyId: string, uid: string, cb: (role: SecretRoleDoc | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), (snap) => {
    cb(snap.exists() ? (snap.data() as SecretRoleDoc) : null)
  })
}

/** For viewing another player's role once it's public (dead, or a CI teammate) - resolves to
 * null on permission-denied (e.g. still alive and not a teammate) rather than hanging. */
export function subscribeRevealedRole(lobbyId: string, uid: string, cb: (role: SecretRoleDoc | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'lobbies', lobbyId, 'secretRoles', uid),
    (snap) => cb(snap.exists() ? (snap.data() as SecretRoleDoc) : null),
    () => cb(null),
  )
}

/** Host-only: reads every player's role, needed to resolve nights and assign Marked's target. */
export async function getAllSecretRoles(lobbyId: string): Promise<RoleAssignments> {
  const snap = await getDocs(col(lobbyId, 'secretRoles'))
  const assignments: RoleAssignments = new Map()
  snap.docs.forEach((d) => {
    const data = d.data() as SecretRoleDoc
    assignments.set(d.id, { uid: d.id, ...data })
  })
  return assignments
}

export async function markSaboteurUsed(lobbyId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), { saboteurUsed: true })
}

/** Marks the generic once-per-game ability used (Warden's Execute, Anomaly, Puppeteer, Cartographer). */
export async function markSpecialUsed(lobbyId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), { specialUsed: true })
}

/** Enforcer only. */
export async function setBulletsLoaded(lobbyId: string, uid: string, bulletsLoaded: number): Promise<void> {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), { bulletsLoaded })
}

/** Enforcer only: fires forever once they've killed a Foundation member. */
export async function jamGun(lobbyId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), { gunJammed: true, bulletsLoaded: 0 })
}

/** Whisperer only: locks in (or clears, on the target's death) who they're sensing. */
export async function setSenseTarget(lobbyId: string, uid: string, targetUid: string | null): Promise<void> {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), { senseTargetUid: targetUid })
}

/** Cultivator only. */
export async function addSeedTarget(lobbyId: string, uid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'lobbies', lobbyId, 'secretRoles', uid), { seededUids: arrayUnion(targetUid) })
}

// ---- nightActions (host-only read; each player writes only their own) ----

export async function submitNightAction(
  lobbyId: string,
  action: Omit<NightActionDoc, 'submittedAt'>,
): Promise<void> {
  await setDoc(doc(db, 'lobbies', lobbyId, 'nightActions', cycleDocId(action.cycle, action.actorUid)), {
    ...action,
    submittedAt: Date.now(),
  } satisfies NightActionDoc)
}

/** Host-only. */
export async function getNightActions(lobbyId: string, cycle: number): Promise<NightActionDoc[]> {
  const q = query(col(lobbyId, 'nightActions'), where('cycle', '==', cycle))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as NightActionDoc)
}

// ---- nightResults (host writes; each player reads only their own) ----

export async function writeNightResults(lobbyId: string, results: NightResultDoc[]): Promise<void> {
  const batch = writeBatch(db)
  for (const result of results) {
    batch.set(doc(db, 'lobbies', lobbyId, 'nightResults', cycleDocId(result.cycle, result.recipientUid)), result)
  }
  await batch.commit()
}

export function subscribeMyNightResult(
  lobbyId: string,
  cycle: number,
  uid: string,
  cb: (result: NightResultDoc | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'lobbies', lobbyId, 'nightResults', cycleDocId(cycle, uid)), (snap) => {
    cb(snap.exists() ? (snap.data() as NightResultDoc) : null)
  })
}

/** Every result this player has ever received, across all cycles - for the notepad's
 * auto-populated ability log. */
export function subscribeMyNightResults(
  lobbyId: string,
  uid: string,
  cb: (results: NightResultDoc[]) => void,
): Unsubscribe {
  const q = query(col(lobbyId, 'nightResults'), where('recipientUid', '==', uid))
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => d.data() as NightResultDoc).sort((a, b) => a.cycle - b.cycle)),
  )
}

// ---- votes (public read; each player writes only their own) ----

export async function submitVote(lobbyId: string, vote: Omit<VoteDoc, 'submittedAt'>): Promise<void> {
  await setDoc(doc(db, 'lobbies', lobbyId, 'votes', cycleDocId(vote.cycle, vote.voterUid)), {
    ...vote,
    submittedAt: Date.now(),
  } satisfies VoteDoc)
}

export function subscribeVotes(lobbyId: string, cycle: number, cb: (votes: VoteDoc[]) => void): Unsubscribe {
  const q = query(col(lobbyId, 'votes'), where('cycle', '==', cycle))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as VoteDoc)))
}

/** Host-only polling use: a one-off read instead of a live subscription. */
export async function getVotes(lobbyId: string, cycle: number): Promise<VoteDoc[]> {
  const q = query(col(lobbyId, 'votes'), where('cycle', '==', cycle))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as VoteDoc)
}

// ---- publicCycleLog (host writes; everyone reads) ----

export async function writePublicCycleLog(lobbyId: string, entry: PublicCycleLogDoc): Promise<void> {
  await setDoc(doc(db, 'lobbies', lobbyId, 'publicCycleLog', String(entry.cycle)), entry)
}

export function subscribePublicCycleLog(lobbyId: string, cb: (entries: PublicCycleLogDoc[]) => void): Unsubscribe {
  return onSnapshot(col(lobbyId, 'publicCycleLog'), (snap) =>
    cb(snap.docs.map((d) => d.data() as PublicCycleLogDoc).sort((a, b) => a.cycle - b.cycle)),
  )
}

// ---- ghostTips (ghosts write, everyone reads; author identity is stored but never rendered) ----

export async function sendGhostTip(lobbyId: string, tip: Omit<GhostTipDoc, 'sentAt'>): Promise<void> {
  const tipId = `${tip.cycleSent}_${tip.authorUid}_${Date.now()}`
  await setDoc(doc(db, 'lobbies', lobbyId, 'ghostTips', tipId), { ...tip, sentAt: Date.now() } satisfies GhostTipDoc)
}

export function subscribeGhostTips(lobbyId: string, cb: (tips: GhostTipDoc[]) => void): Unsubscribe {
  return onSnapshot(col(lobbyId, 'ghostTips'), (snap) =>
    cb(snap.docs.map((d) => d.data() as GhostTipDoc).sort((a, b) => a.sentAt - b.sentAt)),
  )
}

// ---- wills (writable by the author only while alive; readable by self, host, or anyone once
// the author is eliminated - enforced in firestore.rules, not here) ----

export async function setMyWill(lobbyId: string, uid: string, text: string): Promise<void> {
  await setDoc(doc(db, 'lobbies', lobbyId, 'wills', uid), { text, updatedAt: Date.now() } satisfies WillDoc)
}

export function subscribeWill(lobbyId: string, uid: string, cb: (will: WillDoc | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'lobbies', lobbyId, 'wills', uid),
    (snap) => cb(snap.exists() ? (snap.data() as WillDoc) : null),
    () => cb(null), // permission-denied while the author is still alive - expected, not an error
  )
}

// ---- puppeteerOverrides (the puppeteer writes their own once; host-only read) ----
// Deliberately never overwrites the target's own vote doc, so the victim's own UI (which
// reads their own vote, not this collection) never shows anything different from what they
// actually clicked - the host's tally is the only place the override takes effect.

export async function setPuppeteerOverride(
  lobbyId: string,
  override: Omit<PuppeteerOverrideDoc, 'createdAt'>,
): Promise<void> {
  await setDoc(doc(db, 'lobbies', lobbyId, 'puppeteerOverrides', override.puppeteerUid), {
    ...override,
    createdAt: Date.now(),
  } satisfies PuppeteerOverrideDoc)
}

/** Host-only. */
export async function getPuppeteerOverride(lobbyId: string, cycle: number): Promise<PuppeteerOverrideDoc | null> {
  const q = query(col(lobbyId, 'puppeteerOverrides'), where('cycle', '==', cycle))
  const snap = await getDocs(q)
  return snap.empty ? null : (snap.docs[0].data() as PuppeteerOverrideDoc)
}

// ---- tomeTransfers (only the current holder writes their own; host-only read/consume) ----

export async function requestTomeTransfer(lobbyId: string, fromUid: string, toUid: string): Promise<void> {
  await setDoc(doc(db, 'lobbies', lobbyId, 'tomeTransfers', fromUid), {
    toUid,
    requestedAt: Date.now(),
  } satisfies TomeTransferDoc)
}

/** Host-only: reads and immediately deletes any pending transfer for the given holder, so it's consumed exactly once. */
export async function consumeTomeTransfer(lobbyId: string, holderUid: string): Promise<TomeTransferDoc | null> {
  const ref = doc(db, 'lobbies', lobbyId, 'tomeTransfers', holderUid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data() as TomeTransferDoc
  await deleteDoc(ref)
  return data
}

// ---- dayChat (public, phase-gated to non-night; only living players post) ----

export async function sendDayChatMessage(lobbyId: string, msg: Omit<DayChatDoc, 'sentAt'>): Promise<void> {
  await addDoc(col(lobbyId, 'dayChat'), { ...msg, sentAt: Date.now() } satisfies DayChatDoc)
}

export function subscribeDayChat(lobbyId: string, cb: (messages: DayChatDoc[]) => void): Unsubscribe {
  return onSnapshot(col(lobbyId, 'dayChat'), (snap) =>
    cb(snap.docs.map((d) => d.data() as DayChatDoc).sort((a, b) => a.sentAt - b.sentAt)),
  )
}

// ---- whispers (private between two players; also fully readable by the Whisperer - enforced
// in firestore.rules, not here, so this same subscription naturally shows everyone's whispers
// to a Whisperer and only the viewer's own to everyone else) ----

export async function sendWhisper(lobbyId: string, msg: Omit<WhisperDoc, 'sentAt'>): Promise<void> {
  await addDoc(col(lobbyId, 'whispers'), { ...msg, sentAt: Date.now() } satisfies WhisperDoc)
}

export function subscribeMyWhispers(lobbyId: string, cb: (whispers: WhisperDoc[]) => void): Unsubscribe {
  return onSnapshot(col(lobbyId, 'whispers'), (snap) =>
    cb(snap.docs.map((d) => d.data() as WhisperDoc).sort((a, b) => a.sentAt - b.sentAt)),
  )
}
