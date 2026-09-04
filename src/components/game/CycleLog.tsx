import { useGameState } from '../../context/GameStateContext'
import { useLobby } from '../../context/LobbyContext'

export default function CycleLog() {
  const { publicCycleLog } = useGameState()
  const { players } = useLobby()

  if (publicCycleLog.length === 0) return null

  const nameFor = (uid: string) => players.find((p) => p.uid === uid)?.displayName ?? uid

  return (
    <div className="card">
      <h3>Cycle log</h3>
      <ul>
        {publicCycleLog.map((entry) => (
          <li key={entry.cycle}>
            Cycle {entry.cycle}:{' '}
            {entry.tie
              ? 'vote tied, no one eliminated'
              : entry.eliminatedUid
                ? `${nameFor(entry.eliminatedUid)} eliminated (${entry.causeOfDeath})`
                : 'no one eliminated'}
          </li>
        ))}
      </ul>
    </div>
  )
}
