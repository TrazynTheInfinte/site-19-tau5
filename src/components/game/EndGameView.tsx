import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import CycleLog from './CycleLog'

const WINNER_LABEL: Record<string, string> = {
  foundation: 'The Foundation contained the threat.',
  ci: 'The Chaos Insurgency has taken control.',
  draw: 'Overtime expired with no resolution. Draw.',
}

export default function EndGameView() {
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()

  if (!lobby) return null
  const nameFor = (uid: string) => players.find((p) => p.uid === uid)?.displayName ?? uid

  return (
    <div>
      <div className="card">
        <h2>Game over</h2>
        <p>{lobby.winner ? WINNER_LABEL[lobby.winner] : 'Unresolved.'}</p>
        {lobby.personalWinners.length > 0 && (
          <p>Personal wins: {lobby.personalWinners.map(nameFor).join(', ')}</p>
        )}
        {myRole && (
          <p>
            You were <strong>{myRole.role}</strong> ({myRole.faction}).
          </p>
        )}
      </div>
      <CycleLog />
    </div>
  )
}
