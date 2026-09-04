import type { RoleId, Faction, NightActionType } from '../game/types'

export type LobbyStatus = 'lobby' | 'in_progress' | 'ended'
export type GamePhase = 'lobby' | 'night' | 'day' | 'overtime' | 'ended'

export interface LobbyDoc {
  code: string
  hostUid: string
  hostLastSeen: number // epoch ms, client-side heartbeat
  status: LobbyStatus
  phase: GamePhase
  cycle: number
  cycleCap: number
  phaseDeadline: number | null // epoch ms; set for day phase's hard timer, null for night's soft timer
  rolePoolSelection: RoleId[]
  winner: 'foundation' | 'ci' | 'draw' | null
  /** uids of Serpent's Hand players who've independently met their personal win condition; doesn't end the game. */
  personalWinners: string[]
  createdAt: number
}

export interface PlayerDoc {
  displayName: string
  connected: boolean
  lastSeen: number
  alive: boolean
  isHost: boolean
  eliminatedCycle: number | null
}

export interface SecretRoleDoc {
  role: RoleId
  faction: Faction
  markedTargetUid: string | null
  saboteurUsed: boolean
}

export interface NightActionDoc {
  cycle: number
  actorUid: string
  actionType: NightActionType
  targetUid: string
  submittedAt: number
}

export interface NightResultDoc {
  cycle: number
  recipientUid: string
  payload: { type: 'investigate'; targetUid: string; targetFaction: Faction }
}

export interface VoteDoc {
  cycle: number
  voterUid: string
  targetUid: string | null
  submittedAt: number
}

export interface PublicCycleLogDoc {
  cycle: number
  eliminatedUid: string | null
  tie: boolean
  causeOfDeath: 'vote' | 'kill' | null
}

export interface GhostTipDoc {
  authorUid: string
  cycleSent: number
  message: string
  sentAt: number
}

/** Composite doc id helper for per-cycle-per-actor collections (nightActions, nightResults, votes). */
export function cycleDocId(cycle: number, uid: string): string {
  return `${cycle}_${uid}`
}
