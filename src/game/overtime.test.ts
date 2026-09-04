import { describe, expect, it } from 'vitest'
import { isOvertimeReached, resolveOvertimeVote } from './overtime'

describe('isOvertimeReached', () => {
  it('is false while cycle is within the cap', () => {
    expect(isOvertimeReached(3, 4)).toBe(false)
    expect(isOvertimeReached(4, 4)).toBe(false)
  })

  it('is true once cycle exceeds the cap', () => {
    expect(isOvertimeReached(5, 4)).toBe(true)
  })
})

describe('resolveOvertimeVote', () => {
  it('eliminates the top-voted player when everyone votes', () => {
    const result = resolveOvertimeVote(
      [
        { voterUid: 'a', targetUid: 'x' },
        { voterUid: 'b', targetUid: 'x' },
        { voterUid: 'c', targetUid: 'y' },
      ],
      ['a', 'b', 'c'],
    )
    expect(result.eliminatedUid).toBe('x')
  })

  it('results in no elimination on a tie, same as normal cycles', () => {
    const result = resolveOvertimeVote(
      [
        { voterUid: 'a', targetUid: 'x' },
        { voterUid: 'b', targetUid: 'y' },
      ],
      ['a', 'b'],
    )
    expect(result.eliminatedUid).toBeNull()
    expect(result.tie).toBe(true)
  })

  it('throws if a living player did not vote', () => {
    expect(() => resolveOvertimeVote([{ voterUid: 'a', targetUid: 'x' }], ['a', 'b'])).toThrow(/missing forced votes/)
  })

  it('throws if any vote abstains', () => {
    expect(() =>
      resolveOvertimeVote(
        [
          { voterUid: 'a', targetUid: 'x' },
          { voterUid: 'b', targetUid: null },
        ],
        ['a', 'b'],
      ),
    ).toThrow(/abstaining is not allowed/)
  })
})
