import type { Vote, VoteTally } from './types'
import { tallyVotes } from './voting'

/** True once the normal cycle budget (cycleCap) has been used up with no winner. */
export function isOvertimeReached(cycle: number, cycleCap: number): boolean {
  return cycle > cycleCap
}

/**
 * Resolves the overtime forced vote: every living player must vote for someone (no
 * abstaining). Throws if that requirement wasn't met — callers should gate submission
 * UI so this should only happen from a bug, not normal play. A tie still means no
 * elimination, same as a normal-cycle vote.
 */
export function resolveOvertimeVote(votes: Vote[], livingPlayerUids: string[]): VoteTally {
  const voterUids = new Set(votes.map((v) => v.voterUid))
  const missing = livingPlayerUids.filter((uid) => !voterUids.has(uid))
  if (missing.length > 0) {
    throw new Error(`resolveOvertimeVote: missing forced votes from ${missing.join(', ')}`)
  }
  if (votes.some((v) => v.targetUid === null)) {
    throw new Error('resolveOvertimeVote: abstaining is not allowed during overtime')
  }
  return tallyVotes(votes)
}
