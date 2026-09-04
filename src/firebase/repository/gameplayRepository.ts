import {
  collection,
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
  GhostTipDoc,
  NightActionDoc,
  NightResultDoc,
  PublicCycleLogDoc,
  SecretRoleDoc,
  VoteDoc,
} from '../schema'
import { cycleDocId } from '../schema'
import type { RoleAssignments } from '../../game/types'

function col(lobbyId: string, name: string) {
  return collection(db, 'lobbies', lobbyId, name)
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
