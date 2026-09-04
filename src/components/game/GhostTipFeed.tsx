import { useGameState } from '../../context/GameStateContext'

export default function GhostTipFeed() {
  const { ghostTips } = useGameState()
  if (ghostTips.length === 0) return null

  return (
    <div className="card">
      <h3>Anonymous tips</h3>
      <ul>
        {ghostTips.map((tip, i) => (
          <li key={i}>
            [Cycle {tip.cycleSent}] {tip.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
