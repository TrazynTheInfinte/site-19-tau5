import { describe, expect, it } from 'vitest'
import { tallyAccusation, tallyJudgment } from './trial'

describe('tallyAccusation', () => {
  it('puts a player on trial once they have strictly more than half the living voters', () => {
    // 5 living -> majority is 3
    const votes = [
      { voterUid: 'a', targetUid: 'x' },
      { voterUid: 'b', targetUid: 'x' },
      { voterUid: 'c', targetUid: 'x' },
    ]
    expect(tallyAccusation(votes, 5)).toEqual({ accusedUid: 'x', counts: { x: 3 } })
  })

  it('does not trigger a trial below majority', () => {
    const votes = [
      { voterUid: 'a', targetUid: 'x' },
      { voterUid: 'b', targetUid: 'x' },
    ]
    expect(tallyAccusation(votes, 5).accusedUid).toBeNull()
  })

  it('handles an even living count correctly (majority of 4 is 3)', () => {
    const votes = [
      { voterUid: 'a', targetUid: 'x' },
      { voterUid: 'b', targetUid: 'x' },
    ]
    expect(tallyAccusation(votes, 4).accusedUid).toBeNull()
    votes.push({ voterUid: 'c', targetUid: 'x' })
    expect(tallyAccusation(votes, 4).accusedUid).toBe('x')
  })

  it('returns null with no votes at all', () => {
    expect(tallyAccusation([], 5)).toEqual({ accusedUid: null, counts: {} })
  })
})

describe('tallyJudgment', () => {
  it('is guilty when guilty votes strictly outnumber innocent votes', () => {
    const votes: { verdict: 'guilty' | 'innocent' }[] = [
      { verdict: 'guilty' },
      { verdict: 'guilty' },
      { verdict: 'innocent' },
    ]
    expect(tallyJudgment(votes)).toEqual({ verdict: 'guilty', guiltyCount: 2, innocentCount: 1 })
  })

  it('is innocent on a tie', () => {
    const votes: { verdict: 'guilty' | 'innocent' }[] = [{ verdict: 'guilty' }, { verdict: 'innocent' }]
    expect(tallyJudgment(votes).verdict).toBe('innocent')
  })

  it('is innocent when everyone abstains (no votes at all)', () => {
    expect(tallyJudgment([]).verdict).toBe('innocent')
  })

  it('is innocent when innocent votes outnumber guilty', () => {
    const votes: { verdict: 'guilty' | 'innocent' }[] = [
      { verdict: 'innocent' },
      { verdict: 'innocent' },
      { verdict: 'guilty' },
    ]
    expect(tallyJudgment(votes).verdict).toBe('innocent')
  })
})
