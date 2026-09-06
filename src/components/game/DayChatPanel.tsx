import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { sendDayChatMessage, subscribeDayChat } from '../../firebase/repository/gameplayRepository'
import type { DayChatDoc } from '../../firebase/schema'

/** Public in-app chat, alongside whatever voice/Discord discussion is already happening.
 * Only living players can post - ghosts' one sanctioned channel stays the anonymous tip. */
export default function DayChatPanel() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [messages, setMessages] = useState<DayChatDoc[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lobby) return
    return subscribeDayChat(lobby.code, setMessages)
  }, [lobby])

  if (!lobby || !uid) return null
  const me = players.find((p) => p.uid === uid)
  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid

  async function handleSend() {
    if (!text.trim() || !me?.alive) return
    try {
      await sendDayChatMessage(lobby!.code, { authorUid: uid!, cycle: lobby!.cycle, message: text.trim() })
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    }
  }

  return (
    <div className="card">
      <h3>Chat</h3>
      <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: 'var(--space-2)' }}>
        {messages.length === 0 && <p className="faint">No messages yet.</p>}
        {messages.map((m, i) => (
          <p key={i} style={{ margin: '0.2rem 0' }}>
            <strong>{nameFor(m.authorUid)}:</strong> {m.message}
          </p>
        ))}
      </div>
      {me?.alive ? (
        <>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            maxLength={300}
            placeholder="Say something..."
            style={{ width: '70%' }}
          />
          <button disabled={!text.trim()} onClick={handleSend} style={{ marginLeft: '0.5rem' }}>
            Send
          </button>
        </>
      ) : (
        <p className="faint">Ghosts can't post here - use your anonymous tip instead.</p>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
