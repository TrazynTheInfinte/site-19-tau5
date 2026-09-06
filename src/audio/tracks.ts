import type { Faction } from '../game/types'

/** Files live under public/music/<folder>/<file>.mp3 - encoded per segment since several
 * folder and file names contain spaces. */
function musicUrl(folder: string, file: string): string {
  return `/music/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`
}

export type LoopCategory = 'lobby' | 'night' | 'discussion' | 'voting'

const LOOP_TRACKS: Record<LoopCategory, string[]> = {
  lobby: [musicUrl('lobby', 'Containment Protocol.mp3'), musicUrl('lobby', 'Containment Wing.mp3')],
  night: [musicUrl('night', 'Black Salt Drift.mp3')],
  discussion: [musicUrl('day', 'Clockroom.mp3')],
  // Was a one-shot "vote resolved" sting; now the voting phase's own ambient loop for its full
  // 60s, since voting is a dedicated timed phase rather than folded into a combined day phase.
  voting: [musicUrl('voting', 'Ashes of Verdict.mp3')],
}

export function loopCategoryTracks(category: LoopCategory): string[] {
  return LOOP_TRACKS[category]
}

export function randomPick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]
}

/** Fires whenever a voting-phase (or overtime) vote resolves WITH an elimination. Night kills
 * and vote ties get no cue - matches the game's existing "night is silent" theme (see
 * CONTEXT.md's chat/whisper gating), and a tie is already fully represented by the voting
 * loop just continuing uninterrupted. */
export const EXECUTION_TRACK = musicUrl('execution', 'Bell After Impact.mp3')

/** Fires once per player, per game, the moment they first see their own role (not on death -
 * "reveal" here means receiving your role, confirmed against the folder names' actual intent). */
export const REVEAL_TRACKS: Record<Faction, string> = {
  foundation: musicUrl('Foundation Reveal', 'Cold Protocol.mp3'),
  ci: musicUrl('CI reveal', 'Klaxon Fracture.mp3'),
  serpentsHand: musicUrl('SH reveal', 'Iron Oath Strike.mp3'),
}

/** A draw has no dedicated track and plays nothing. */
export const WIN_TRACKS: Partial<Record<'foundation' | 'ci' | 'draw', string>> = {
  foundation: musicUrl('foundation win', 'Containment Restored.mp3'),
  ci: musicUrl('CI win', 'Twisted Crown.mp3'),
}
