/**
 * Pure trial-resolution logic for the accusation -> defense -> judgment loop (see CONTEXT.md's
 * Trial entry), adapted from Town of Salem 2's trial system.
 */

export interface AccusationTally {
  /** The player who reached majority, if anyone did - at most one candidate ever can, since
   * each voter accuses only one target and majority requires more than half the votes. */
  accusedUid: string | null
  counts: Record<string, number>
}

/** A player goes to trial once they have strictly more than half of the living voters'
 * accusations - matches ToS2's majority-to-trial threshold. */
export function tallyAccusation(
  votes: { voterUid: string; targetUid: string }[],
  livingCount: number,
): AccusationTally {
  const counts: Record<string, number> = {}
  for (const vote of votes) {
    counts[vote.targetUid] = (counts[vote.targetUid] ?? 0) + 1
  }

  const majority = Math.floor(livingCount / 2) + 1
  for (const [targetUid, count] of Object.entries(counts)) {
    if (count >= majority) return { accusedUid: targetUid, counts }
  }
  return { accusedUid: null, counts }
}

export type Verdict = 'guilty' | 'innocent'

export interface JudgmentTally {
  verdict: Verdict
  guiltyCount: number
  innocentCount: number
}

/** Guilty requires strictly more Guilty votes than Innocent - a tie (including 0-0, i.e.
 * everyone abstained or nobody voted in time) is Innocent, matching ToS2. There's no explicit
 * "Abstain" choice in the data itself - not voting Guilty or Innocent before the judgment
 * timer expires simply doesn't count either way, the same way ToS2's own UI works. */
export function tallyJudgment(votes: { verdict: Verdict }[]): JudgmentTally {
  const guiltyCount = votes.filter((v) => v.verdict === 'guilty').length
  const innocentCount = votes.filter((v) => v.verdict === 'innocent').length
  return { verdict: guiltyCount > innocentCount ? 'guilty' : 'innocent', guiltyCount, innocentCount }
}
