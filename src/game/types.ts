export type Faction = 'foundation' | 'ci' | 'serpentsHand'

export type RoleId =
  | 'agent'
  | 'researcher'
  | 'medicalOfficer'
  | 'tracker'
  | 'warden'
  | 'infiltrator'
  | 'saboteur'
  | 'framer'
  | 'anomaly'
  | 'theFool'
  | 'theMarked'
  | 'puppeteer'
  | 'cartographer'

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
  infiltrator: { id: 'infiltrator', faction: 'ci', name: 'Infiltrator' },
  saboteur: { id: 'saboteur', faction: 'ci', name: 'Saboteur' },
  framer: { id: 'framer', faction: 'ci', name: 'Framer' },
  anomaly: { id: 'anomaly', faction: 'ci', name: 'Anomaly' },
  theFool: { id: 'theFool', faction: 'serpentsHand', name: 'The Fool' },
  theMarked: { id: 'theMarked', faction: 'serpentsHand', name: 'The Marked' },
  puppeteer: { id: 'puppeteer', faction: 'serpentsHand', name: 'The Puppeteer' },
  cartographer: { id: 'cartographer', faction: 'serpentsHand', name: 'The Cartographer' },
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

export type NightResultPayload = InvestigateResult | TrackResult

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
