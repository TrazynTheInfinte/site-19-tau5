import type { Vote, VoteTally } from './types'

/**
 * Tallies a day-phase vote. A tie for the highest vote count (including a tie at zero,
 * i.e. everyone abstained) results in no elimination, per CONTEXT.md.
 */
export function tallyVotes(votes: Vote[]): VoteTally {
  const counts: Record<string, number> = {}
  for (const vote of votes) {
    if (vote.targetUid === null) continue
    counts[vote.targetUid] = (counts[vote.targetUid] ?? 0) + 1
  }

  const entries = Object.entries(counts)
  if (entries.length === 0) {
    return { eliminatedUid: null, tie: false, counts }
  }

  const max = Math.max(...entries.map(([, count]) => count))
  const topTargets = entries.filter(([, count]) => count === max).map(([uid]) => uid)

  if (topTargets.length > 1) {
    return { eliminatedUid: null, tie: true, counts }
  }

  return { eliminatedUid: topTargets[0], tie: false, counts }
}
