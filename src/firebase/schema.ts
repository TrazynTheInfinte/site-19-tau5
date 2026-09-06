import type { RoleId, Faction, NightActionType } from '../game/types'

export type LobbyStatus = 'lobby' | 'in_progress' | 'ended'
// 'briefing' is cycle 0: an opening talk-only day before Night 1 - timed like discussion, but
// with no voting at all (nobody's died yet, so nothing to vote on anyway). Every other cycle's
// day is 'discussion' (talk, skippable once everyone's ready) followed by 'voting' (cast votes).
// 'overtime' skips discussion entirely - it's a forced, no-abstain, sudden-death vote only.
// 'showdown' preempts the normal cycle flow entirely - see LobbyDoc.showdown.
export type GamePhase = 'lobby' | 'briefing' | 'night' | 'discussion' | 'voting' | 'overtime' | 'showdown' | 'ended'

/** Live state for the Enforcer-vs-last-CI Showdown minigame (see CONTEXT.md). chamberPosition
 * is rolled once, up front, and safe to read publicly - no player action affects who it lands
 * on, so nothing is lost by making the pull history/outcome visible to every spectator live. */
export interface ShowdownState {
  participantUids: [string, string]
  turnUid: string
  pulls: number
  chamberPosition: number
  loserUid: string | null
}

export interface LobbyDoc {
  code: string
  hostUid: string
  hostLastSeen: number // epoch ms, client-side heartbeat
  status: LobbyStatus
  phase: GamePhase
  cycle: number
  cycleCap: number
  phaseDeadline: number | null // epoch ms; set for briefing/discussion/voting's hard timer, null for night's soft timer
  rolePoolSelection: RoleId[]
  winner: 'foundation' | 'ci' | 'draw' | null
  /** uids of Serpent's Hand players who've independently met their personal win condition; doesn't end the game. */
  personalWinners: string[]
  /** Chaos Insurgency's shared Tome: whoever holds it may kill as their night action regardless
   * of role, and reads as Foundation to investigation. Null if no CI is in this game's role pool. */
  tomeHolderUid: string | null
  /** Set only while phase === 'showdown'; null otherwise (including before it's ever happened). */
  showdown: ShowdownState | null
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
   * same early-exit pattern as the voting phase's "everyone's voted" check. Reset false at game start. */
  briefingReady: boolean
  /** Same idea as briefingReady, but for the discussion phase every other cycle - reset false at
   * the start of each new discussion, not just once at game start. */
  discussionReady: boolean
}

export interface SecretRoleDoc {
  role: RoleId
  faction: Faction
  markedTargetUid: string | null
  saboteurUsed: boolean
  specialUsed: boolean
  /** Enforcer only. */
  bulletsLoaded: number
  gunJammed: boolean
  /** Whisperer only. */
  senseTargetUid: string | null
  /** Cultivator only. */
  seededUids: string[]
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
    | { type: 'sense'; targetUid: string; visited: string | null; visitedBy: string[] }
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
  causeOfDeath: 'vote' | 'kill' | 'showdown' | null
}

/** One trigger-pull in the Showdown minigame. Doc id == `{cycle}_{pullNumber}`, pullNumber
 * starting at 1 - the strictly-increasing id (rather than one doc per actor) is what lets the
 * host resolver detect "a new pull happened" with a simple count comparison. */
export interface ShowdownPullDoc {
  cycle: number
  actorUid: string
  pullNumber: number
  submittedAt: number
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

/** Public in-app day chat - anyone can read; only living players can post (dead players'
 * only sanctioned channel stays the anonymous ghost tip). Phase-gated to non-night. */
export interface DayChatDoc {
  authorUid: string
  cycle: number
  message: string
  sentAt: number
}

/** A private message to one other player. Readable by the two participants, plus anyone
 * whose role is Whisperer (their passive power is hearing every whisper's content). */
export interface WhisperDoc {
  fromUid: string
  toUid: string
  cycle: number
  message: string
  sentAt: number
}

/** Composite doc id helper for per-cycle-per-actor collections (nightActions, nightResults, votes). */
export function cycleDocId(cycle: number, uid: string): string {
  return `${cycle}_${uid}`
}
