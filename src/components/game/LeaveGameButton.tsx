import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { forfeitGame } from '../../firebase/repository/lobbyRepository'

export default function LeaveGameButton() {
  const { uid } = useAuth()
  const { lobbyId, lobby } = useLobby()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  if (!lobbyId || !lobby || !uid) return null

  async function handleLeave() {
    if (!window.confirm("Leaving now forfeits the game for you — you'll be eliminated and can't rejoin. Continue?")) {
      return
    }
    setLeaving(true)
    try {
      await forfeitGame(lobbyId!, uid!, lobby!.cycle)
      navigate('/')
    } catch {
      setLeaving(false)
    }
  }

  return (
    <button onClick={handleLeave} disabled={leaving} style={{ borderColor: '#ff6b6b' }}>
      {leaving ? 'Leaving...' : 'Leave game (forfeit)'}
    </button>
  )
}
