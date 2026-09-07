import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { sendWhisper, subscribeMyWhispers } from '../../firebase/repository/gameplayRepository'
import type { WhisperDoc } from '../../firebase/schema'

/** Private messages. Firestore rules narrow a normal reader's query to just their own
 * sent/received whispers (or everything, for the Whisperer's passive power) - but the host
 * has a broad read bypass on this collection too (needed so a restart can wipe it), so a host
 * who isn't the Whisperer would otherwise see every whisper here as well. Must re-filter
 * client-side rather than trust the query result, same fix as the CI-teammate/host leak. */
export default function WhisperPanel() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [allWhispers, setAllWhispers] = useState<WhisperDoc[]>([])
  const [target, setTarget] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lobby) return
    return subscribeMyWhispers(lobby.code, setAllWhispers)
  }, [lobby])

  const isWhisperer = myRole?.role === 'whisperer'
  const whispers = isWhisperer ? allWhispers : allWhispers.filter((w) => w.fromUid === uid || w.toUid === uid)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [whispers.length])

  if (!lobby || !uid) return null
  const me = players.find((p) => p.uid === uid)
  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid
  const others = players.filter((p) => p.alive && p.uid !== uid)

  async function handleSend() {
    if (!text.trim() || !target || !me?.alive) return
    try {
      await sendWhisper(lobby!.code, { fromUid: uid!, toUid: target, cycle: lobby!.cycle, message: text.trim() })
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send whisper')
    }
  }

  return (
    <div className="card">
      <h3>Whispers</h3>
      {isWhisperer && <p className="faint">You hear the content of every whisper sent in this lobby.</p>}
      <div ref={scrollRef} style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: 'var(--space-2)' }}>
        {whispers.length === 0 && <p className="faint">No whispers yet.</p>}
        {whispers.map((w, i) => (
          <div key={i}>
            {(i === 0 || whispers[i - 1].cycle !== w.cycle) && (
              <p className="faint" style={{ textAlign: 'center', margin: '0.4rem 0', fontSize: '0.75rem' }}>
                — Cycle {w.cycle} —
              </p>
            )}
            <p style={{ margin: '0.2rem 0', fontStyle: 'italic' }}>
              {nameFor(w.fromUid)} → {nameFor(w.toUid)}: {w.message}
            </p>
          </div>
        ))}
      </div>
      {me?.alive ? (
        <>
          <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 'auto' }}>
            <option value="">-- whisper to --</option>
            {others.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.displayName}
              </option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            maxLength={300}
            placeholder="Whisper..."
            style={{ width: '50%', marginLeft: '0.5rem' }}
          />
          <button disabled={!text.trim() || !target} onClick={handleSend} style={{ marginLeft: '0.5rem' }}>
            Send
          </button>
        </>
      ) : (
        <p className="faint">Ghosts can't whisper.</p>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
