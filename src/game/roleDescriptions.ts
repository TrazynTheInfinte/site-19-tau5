import type { RoleId } from './types'

/** Short in-game reference text for each role's power - shown on the player's own role card. */
export const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  agent: 'No special ability. Just a vote.',
  researcher: 'Each night, investigate one player and learn their faction.',
  medicalOfficer: 'Each night, protect one player from elimination.',
  tracker: 'Each night, learn only whether a target took any action - not what, not their faction.',
  warden:
    'Each night, detain a target: blocks their action and protects them from elimination at once. Once per game, Execute the detained target instead - an unblockable kill.',
  infiltrator:
    "No innate ability. Killing is the Tome's privilege, for every Chaos Insurgency role - your only distinction is starting the game holding it.",
  saboteur: "Once per game, block another player's night ability instead of killing.",
  framer: "Each night, make a target appear as Chaos Insurgency to any Researcher investigation that night.",
  anomaly:
    'Once per game (not Night 1), an unblockable kill - cannot target another Chaos Insurgency member.',
  theFool: 'Wins if voted out by the Foundation during a day-phase vote.',
  theMarked: 'Assigned a secret Foundation target. Wins if that target is voted out or killed.',
  puppeteer:
    "Once per game, secretly force another living player's vote to count for a target of your choosing - they'll never know. Wins by surviving to the end.",
  cartographer:
    "Once per game, silently swap the night-action targets of two other players. Wins by surviving to the end.",
}
