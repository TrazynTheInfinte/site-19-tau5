export type Faction = 'foundation' | 'ci' | 'serpentsHand'

export type RoleId =
  | 'agent'
  | 'researcher'
  | 'medicalOfficer'
  | 'tracker'
  | 'warden'
  | 'enforcer'
  | 'infiltrator'
  | 'saboteur'
  | 'framer'
  | 'anomaly'
  | 'whisperer'
  | 'theFool'
  | 'theMarked'
  | 'puppeteer'
  | 'cartographer'
  | 'cultivator'

export interface RoleDefinition {
  id: RoleId
  faction: Faction
  name: string
}

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  agent: { id: 'agent', faction: 'foundation', name: 'Agent' },
  researcher: { id: 'researcher', faction: 'foundation', name: 'Researcher' },
  medicalOfficer: { id: 'medicalOfficer', faction: 'foundation', name: 'Medical Officer' },
  tracker: { id: 'tracker', faction: 'foundation', name: 'Tracker' },
  warden: { id: 'warden', faction: 'foundation', name: 'Warden' },
  enforcer: { id: 'enforcer', faction: 'foundation', name: 'Enforcer' },
  infiltrator: { id: 'infiltrator', faction: 'ci', name: 'Infiltrator' },
  saboteur: { id: 'saboteur', faction: 'ci', name: 'Saboteur' },
  framer: { id: 'framer', faction: 'ci', name: 'Framer' },
  anomaly: { id: 'anomaly', faction: 'ci', name: 'Anomaly' },
  whisperer: { id: 'whisperer', faction: 'ci', name: 'The Whisperer' },
  theFool: { id: 'theFool', faction: 'serpentsHand', name: 'The Fool' },
  theMarked: { id: 'theMarked', faction: 'serpentsHand', name: 'The Marked' },
  puppeteer: { id: 'puppeteer', faction: 'serpentsHand', name: 'The Puppeteer' },
  cartographer: { id: 'cartographer', faction: 'serpentsHand', name: 'The Cartographer' },
  cultivator: { id: 'cultivator', faction: 'serpentsHand', name: 'The Cultivator' },
}

export const ALL_ROLE_IDS: RoleId[] = Object.keys(ROLE_DEFINITIONS) as RoleId[]

/** Serpent's Hand roles whose personal win is "survive to the end", checked when the game
 * ends (by any means), rather than triggered by a specific elimination event. */
export const SURVIVE_TO_END_ROLES: RoleId[] = ['puppeteer', 'cartographer']

export interface PlayerState {
  uid: string
  displayName: string
  alive: boolean
  eliminatedCycle: number | null
}

export interface RoleAssignment {
  uid: string
  role: RoleId
  faction: Faction
  /** Only set for theMarked: the Foundation player whose elimination wins the game for them. */
  markedTargetUid: string | null
  /** Only meaningful for saboteur: whether the once-per-game block has been used. */
  saboteurUsed: boolean
  /** Generic once-per-game flag reused by Warden's Execute, Anomaly, Puppeteer, and Cartographer. */
  specialUsed: boolean
  /** Enforcer only: bullets currently loaded (0-2). */
  bulletsLoaded: number
  /** Enforcer only: true forever once they've shot a Foundation member - no more loading or shooting. */
  gunJammed: boolean
  /** Whisperer only: the player they're currently sensing (null until chosen, or after the target dies). */
  senseTargetUid: string | null
  /** Cultivator only: living-when-seeded players they've given the seed to, up to seedTargetCount(playerCount). */
  seededUids: string[]
}

export type RoleAssignments = Map<string, RoleAssignment>

export type NightActionType =
  | 'investigate'
  | 'protect'
  | 'kill'
  | 'block'
  | 'track'
  | 'detain'
  | 'execute'
  | 'frame'
  | 'trueKill'
  | 'cartographerSwap'
  | 'load'
  | 'sense'
  | 'seed'

export interface NightAction {
  cycle: number
  actorUid: string
  actionType: NightActionType
  targetUid: string
  /** Only used by cartographerSwap: the second player whose target gets swapped with targetUid's. */
  secondaryTargetUid?: string
}

export interface InvestigateResult {
  type: 'investigate'
  actorUid: string
  targetUid: string
  targetFaction: Faction
}

export interface TrackResult {
  type: 'track'
  actorUid: string
  targetUid: string
  /** Whether the target submitted any night action this cycle (regardless of whether it was blocked). */
  acted: boolean
}

export interface SenseResult {
  type: 'sense'
  actorUid: string
  targetUid: string
  /** Who the sensed target visited this cycle, if anyone. */
  visited: string | null
  /** Who visited the sensed target this cycle. */
  visitedBy: string[]
}

export type NightResultPayload = InvestigateResult | TrackResult | SenseResult

export interface NightResolutionResult {
  eliminatedUid: string | null
  /** actorUids whose action was disabled (blocked, or detained) this cycle */
  disabledActorUids: string[]
  investigationResults: InvestigateResult[]
  trackResults: TrackResult[]
}

export interface Vote {
  voterUid: string
  /** null means abstain; not permitted during overtime's forced vote */
  targetUid: string | null
}

export interface VoteTally {
  eliminatedUid: string | null
  tie: boolean
  counts: Record<string, number>
}

export type EliminationCause = 'vote' | 'kill'

export interface EliminationEvent {
  uid: string
  cause: EliminationCause
  cycle: number
}

export interface PersonalWin {
  uid: string
  role: RoleId
}

export type FactionWinner = 'foundation' | 'ci' | null

/** How many players the Cultivator must seed before they can start hunting them - scaled down
 * from Town of Salem's fixed 3 for our smaller lobbies. */
export function seedTargetCount(totalPlayers: number): number {
  return totalPlayers <= 5 ? 2 : 3
}
