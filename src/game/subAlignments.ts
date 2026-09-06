import type { RoleId } from './types'

/**
 * Town of Salem 2's sub-alignment system (see https://town-of-salem.fandom.com/wiki/Alignments_(ToS_2)),
 * mapped onto our roles by nearest real-world equivalent: Foundation -> Town, Chaos Insurgency
 * -> Coven, Serpent's Hand -> Neutral. These are our own reskinned/adapted roles, not ToS2's
 * originals, so the mapping is a judgment call per role, not a lookup of an official value:
 *   - Warden/Enforcer (Jailor/Vigilante equivalents) are Town Killing, matching their real
 *     canonical classification, despite Warden's detain also reading as protective.
 *   - Infiltrator (starts holding the Tome, like a Coven Leader) is Coven Power.
 *   - Saboteur/Framer both disrupt or distort information rather than kill or support outright,
 *     so both land on Coven Deception.
 *   - Anomaly's unblockable kill matches Coven Killing's "independent attack" definition.
 *   - The Fool/The Marked/Puppeteer/Cartographer are all selfish, ally-with-anyone, non-killing
 *     objectives - Neutral Evil. The Cultivator's whole win condition is built around killing
 *     its seeded targets, closer to Neutral Killing despite the kill itself being blockable.
 */
export type SubAlignmentCode = 'TI' | 'TP' | 'TK' | 'TS' | 'CP' | 'CD' | 'CK' | 'CU' | 'NE' | 'NK'

export const SUB_ALIGNMENT_NAMES: Record<SubAlignmentCode, string> = {
  TI: 'Town Investigative',
  TP: 'Town Protective',
  TK: 'Town Killing',
  TS: 'Town Support',
  CP: 'Coven Power',
  CD: 'Coven Deception',
  CK: 'Coven Killing',
  CU: 'Coven Utility',
  NE: 'Neutral Evil',
  NK: 'Neutral Killing',
}

export const SUB_ALIGNMENT_BLURB: Record<SubAlignmentCode, string> = {
  TI: 'Gathers information to expose evils or confirm alibis.',
  TP: 'Protects other members of the faction with a tactical power.',
  TK: 'Has direct, personal control over their own kill.',
  TS: 'A miscellaneous ability that supports the faction without killing or protecting.',
  CP: "A high-value role central to the Insurgency's success.",
  CD: 'Confuses or restrains information for whoever opposes the Insurgency.',
  CK: "Capable of an independent kill on top of the Tome holder's.",
  CU: 'A supporting ability with a useful, if unglamorous, function.',
  NE: 'A selfish objective, free to ally with anyone if it helps achieve it.',
  NK: 'An independently bloodthirsty role built around killing to win.',
}

export const SUB_ALIGNMENTS: Record<RoleId, SubAlignmentCode> = {
  agent: 'TS',
  researcher: 'TI',
  medicalOfficer: 'TP',
  tracker: 'TI',
  warden: 'TK',
  enforcer: 'TK',
  infiltrator: 'CP',
  saboteur: 'CD',
  framer: 'CD',
  anomaly: 'CK',
  whisperer: 'CU',
  theFool: 'NE',
  theMarked: 'NE',
  puppeteer: 'NE',
  cartographer: 'NE',
  cultivator: 'NK',
}
