import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { forfeitGame, setPlayerConnected } from '../../firebase/repository/lobbyRepository'

export default function LeaveGameButton() {
  const { uid } = useAuth()
  const { lobbyId, lobby, players } = useLobby()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  if (!lobbyId || !lobby || !uid) return null
  const me = players.find((p) => p.uid === uid)
  const alive = me?.alive ?? false

  async function handleLeave() {
    // Already eliminated: leaving changes nothing about the game outcome, so no forfeit
    // confirmation needed - just stop being present.
    if (alive) {
      if (!window.confirm("Leaving now forfeits the game for you — you'll be eliminated and can't rejoin. Continue?")) {
        return
      }
    }
    setLeaving(true)
    try {
      if (alive) {
        await forfeitGame(lobbyId!, uid!, lobby!.cycle)
      } else {
        await setPlayerConnected(lobbyId!, uid!, false)
      }
      navigate('/')
    } catch {
      setLeaving(false)
    }
  }

  return (
    <button className="danger" onClick={handleLeave} disabled={leaving}>
      {leaving ? 'Leaving...' : alive ? 'Leave game (forfeit)' : 'Leave game'}
    </button>
  )
}
