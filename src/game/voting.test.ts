import { describe, expect, it } from 'vitest'
import { tallyVotes } from './voting'

describe('tallyVotes', () => {
  it('eliminates the player with the most votes', () => {
    const result = tallyVotes([
      { voterUid: 'a', targetUid: 'x' },
      { voterUid: 'b', targetUid: 'x' },
      { voterUid: 'c', targetUid: 'y' },
    ])
    expect(result.eliminatedUid).toBe('x')
    expect(result.tie).toBe(false)
  })

  it('results in no elimination on a tie', () => {
    const result = tallyVotes([
      { voterUid: 'a', targetUid: 'x' },
      { voterUid: 'b', targetUid: 'y' },
    ])
    expect(result.eliminatedUid).toBeNull()
    expect(result.tie).toBe(true)
  })

  it('results in no elimination when everyone abstains', () => {
    const result = tallyVotes([
      { voterUid: 'a', targetUid: null },
      { voterUid: 'b', targetUid: null },
    ])
    expect(result.eliminatedUid).toBeNull()
    expect(result.tie).toBe(false)
  })
})
