import type { RoleId, Faction, NightActionType } from '../game/types'

export type LobbyStatus = 'lobby' | 'in_progress' | 'ended'
// 'briefing' is cycle 0: an opening talk-only day before Night 1 - timed like a normal day,
// but with no voting at all (nobody's died yet, so nothing to vote on anyway).
export type GamePhase = 'lobby' | 'briefing' | 'night' | 'day' | 'overtime' | 'ended'

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
  /** Chaos Insurgency's shared Tome: whoever holds it may kill as their night action regardless
   * of role, and reads as Foundation to investigation. Null if no CI is in this game's role pool. */
  tomeHolderUid: string | null
  createdAt: number
}

export interface PlayerDoc {
  displayName: string
  connected: boolean
  lastSeen: number
  alive: boolean
  isHost: boolean
  eliminatedCycle: number | null
  /** Clicked "ready" during the briefing (cycle 0) - lets the briefing end early once everyone has,
   * same early-exit pattern as the day phase's "everyone's voted" check. Reset false at game start. */
  briefingReady: boolean
}

export interface SecretRoleDoc {
  role: RoleId
  faction: Faction
  markedTargetUid: string | null
  saboteurUsed: boolean
  specialUsed: boolean
}

export interface NightActionDoc {
  cycle: number
  actorUid: string
  actionType: NightActionType
  targetUid: string
  secondaryTargetUid?: string
  submittedAt: number
}

export interface NightResultDoc {
  cycle: number
  recipientUid: string
  payload:
    | { type: 'investigate'; targetUid: string; targetFaction: Faction }
    | { type: 'track'; targetUid: string; acted: boolean }
}

/** A Puppeteer's once-per-game secret vote override: `targetVoterUid`'s vote is counted as
 * `forcedTarget` in the host's tally, without altering `targetVoterUid`'s own visible vote doc. */
export interface PuppeteerOverrideDoc {
  cycle: number
  puppeteerUid: string
  targetVoterUid: string
  forcedTarget: string
  createdAt: number
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

/** A player's last will - editable only while alive, revealed to everyone once eliminated. */
export interface WillDoc {
  text: string
  updatedAt: number
}

/** A pending Tome hand-off, requested by the current holder. Doc id == the current holder's
 * uid, so there's at most one pending request per holder at a time. */
export interface TomeTransferDoc {
  toUid: string
  requestedAt: number
}

/** Composite doc id helper for per-cycle-per-actor collections (nightActions, nightResults, votes). */
export function cycleDocId(cycle: number, uid: string): string {
  return `${cycle}_${uid}`
}
