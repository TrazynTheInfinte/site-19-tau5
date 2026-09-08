import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { sendNightChatMessage, subscribeNightChat } from '../../firebase/repository/gameplayRepository'
import type { NightChatDoc } from '../../firebase/schema'

/** Chaos Insurgency's own channel, night only - "the CI team chooses a kill together"
 * already implied they could talk it over (see CONTEXT.md's CI mutual visibility entry);
 * this makes that talk actually happen in-app instead of staying out-of-band. Only ever
 * rendered for a CI player (see GameRoute) - no client-side filtering needed, unlike
 * WhisperPanel/SecretRoleCard, since it's never mounted at all for a non-CI player. */
export default function NightChatPanel() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [messages, setMessages] = useState<NightChatDoc[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lobby) return
    return subscribeNightChat(lobby.code, setMessages)
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
      await sendNightChatMessage(lobby!.code, { authorUid: uid!, cycle: lobby!.cycle, message: text.trim() })
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    }
  }

  return (
    <div className="card" style={{ borderColor: 'var(--ci)' }}>
      <h3 className="faction-ci">Chaos Insurgency channel</h3>
      <p className="faint">Only your team can see this.</p>
      <div ref={scrollRef} style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: 'var(--space-2)' }}>
        {messages.length === 0 && <p className="faint">No messages yet.</p>}
        {messages.map((m, i) => (
          <div key={i}>
            {(i === 0 || messages[i - 1].cycle !== m.cycle) && (
              <p className="faint" style={{ textAlign: 'center', margin: '0.4rem 0', fontSize: '0.75rem' }}>
                — Night {m.cycle} —
              </p>
            )}
            <p style={{ margin: '0.2rem 0' }}>
              <strong>{nameFor(m.authorUid)}:</strong> {m.message}
            </p>
          </div>
        ))}
      </div>
      {myRole?.faction === 'ci' && me?.alive ? (
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
        <p className="faint">Ghosts can't post here.</p>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
