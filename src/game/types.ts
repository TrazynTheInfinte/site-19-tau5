export type Faction = 'foundation' | 'ci' | 'serpentsHand'

export type RoleId =
  | 'agent'
  | 'researcher'
  | 'medicalOfficer'
  | 'infiltrator'
  | 'saboteur'
  | 'theFool'
  | 'theMarked'

export interface RoleDefinition {
  id: RoleId
  faction: Faction
  name: string
}

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  agent: { id: 'agent', faction: 'foundation', name: 'Agent' },
  researcher: { id: 'researcher', faction: 'foundation', name: 'Researcher' },
  medicalOfficer: { id: 'medicalOfficer', faction: 'foundation', name: 'Medical Officer' },
  infiltrator: { id: 'infiltrator', faction: 'ci', name: 'Infiltrator' },
  saboteur: { id: 'saboteur', faction: 'ci', name: 'Saboteur' },
  theFool: { id: 'theFool', faction: 'serpentsHand', name: 'The Fool' },
  theMarked: { id: 'theMarked', faction: 'serpentsHand', name: 'The Marked' },
}

export const ALL_ROLE_IDS: RoleId[] = Object.keys(ROLE_DEFINITIONS) as RoleId[]

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
}

export type RoleAssignments = Map<string, RoleAssignment>

export type NightActionType = 'investigate' | 'protect' | 'kill' | 'block'

export interface NightAction {
  cycle: number
  actorUid: string
  actionType: NightActionType
  targetUid: string
}

export interface InvestigateResult {
  type: 'investigate'
  actorUid: string
  targetUid: string
  targetFaction: Faction
}

export interface NightResolutionResult {
  eliminatedUid: string | null
  /** actorUids whose action was disabled (blocked) this cycle */
  disabledActorUids: string[]
  investigationResults: InvestigateResult[]
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
