import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { sendGhostTip } from '../../firebase/repository/gameplayRepository'
import { useState } from 'react'

/** Previously, the only sign a player had died was a dimmed dot next to their own name in the
 * roster - easy to miss entirely. This is impossible to miss: a persistent banner at the top
 * of the screen for as long as you're dead, with the anonymous-tip composer built right in
 * instead of leaving it to be found further down the page. */
export default function GhostBanner() {
  const { uid } = useAuth()
  const { lobby } = useLobby()
  const { ghostTips } = useGameState()
  const [message, setMessage] = useState('')

  if (!uid || !lobby) return null

  const alreadySentThisCycle = ghostTips.some((t) => t.authorUid === uid && t.cycleSent === lobby.cycle)

  async function handleSend() {
    if (!message.trim()) return
    await sendGhostTip(lobby!.code, { authorUid: uid!, cycleSent: lobby!.cycle, message: message.trim() })
    setMessage('')
  }

  return (
    <div
      style={{
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--text-faint)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-2) var(--space-3)',
        marginBottom: 'var(--space-3)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
    >
      <strong style={{ fontSize: '0.95rem' }}>👻 You are a ghost</strong>
      <span className="faint" style={{ fontSize: '0.85rem' }}>
        You can't act or vote, but you can send one anonymous tip per cycle.
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', flexGrow: 1, minWidth: '260px' }}>
        {alreadySentThisCycle ? (
          <span className="faint" style={{ fontSize: '0.85rem' }}>Tip already sent this cycle.</span>
        ) : (
          <>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              maxLength={200}
              placeholder="Send an anonymous tip..."
              style={{ flexGrow: 1 }}
            />
            <button disabled={!message.trim()} onClick={handleSend}>
              Send
            </button>
          </>
        )}
      </div>
    </div>
  )
}
