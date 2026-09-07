import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { sendDayChatMessage, subscribeDayChat } from '../../firebase/repository/gameplayRepository'
import type { DayChatDoc } from '../../firebase/schema'

/** Public in-app chat, alongside whatever voice/Discord discussion is already happening.
 * Only living players can post - ghosts' one sanctioned channel stays the anonymous tip.
 * Runs for the whole game, not just the current cycle (see CONTEXT.md's Chat and whispers
 * entry) - older cycles stay in the scrollback, marked off by a divider, rather than being
 * hidden; a restart wipes the whole collection, so nothing carries into a new game. */
export default function DayChatPanel() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [messages, setMessages] = useState<DayChatDoc[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lobby) return
    return subscribeDayChat(lobby.code, setMessages)
  }, [lobby])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

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
      <div ref={scrollRef} style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: 'var(--space-2)' }}>
        {messages.length === 0 && <p className="faint">No messages yet.</p>}
        {messages.map((m, i) => (
          <div key={i}>
            {(i === 0 || messages[i - 1].cycle !== m.cycle) && (
              <p className="faint" style={{ textAlign: 'center', margin: '0.4rem 0', fontSize: '0.75rem' }}>
                — Cycle {m.cycle} —
              </p>
            )}
            <p style={{ margin: '0.2rem 0' }}>
              <strong>{nameFor(m.authorUid)}:</strong> {m.message}
            </p>
          </div>
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
