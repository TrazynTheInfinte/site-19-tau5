import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { sendGhostTip } from '../../firebase/repository/gameplayRepository'

export default function GhostTipComposer() {
  const { uid } = useAuth()
  const { lobby } = useLobby()
  const { ghostTips } = useGameState()
  const [message, setMessage] = useState('')

  if (!uid || !lobby) return null

  const alreadySentThisCycle = ghostTips.some((t) => t.authorUid === uid && t.cycleSent === lobby.cycle)

  async function handleSend() {
    if (!message.trim() || !uid || !lobby) return
    await sendGhostTip(lobby.code, { authorUid: uid, cycleSent: lobby.cycle, message: message.trim() })
    setMessage('')
  }

  if (alreadySentThisCycle) {
    return <p>You've already sent a tip this cycle.</p>
  }

  return (
    <div className="card">
      <h3>Send an anonymous tip</h3>
      <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} style={{ width: '70%' }} />
      <button disabled={!message.trim()} onClick={handleSend} style={{ marginLeft: '0.5rem' }}>
        Send
      </button>
    </div>
  )
}
