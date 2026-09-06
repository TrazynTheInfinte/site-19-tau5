import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { sendWhisper, subscribeMyWhispers } from '../../firebase/repository/gameplayRepository'
import type { WhisperDoc } from '../../firebase/schema'

/** Private messages. Firestore rules mean this subscription naturally shows only the
 * viewer's own sent/received whispers - except for the Whisperer, who sees every whisper in
 * the lobby (their passive power), so the same component just works for both. */
export default function WhisperPanel() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [whispers, setWhispers] = useState<WhisperDoc[]>([])
  const [target, setTarget] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lobby) return
    return subscribeMyWhispers(lobby.code, setWhispers)
  }, [lobby])

  if (!lobby || !uid) return null
  const me = players.find((p) => p.uid === uid)
  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid
  const others = players.filter((p) => p.alive && p.uid !== uid)
  const isWhisperer = myRole?.role === 'whisperer'

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
      <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: 'var(--space-2)' }}>
        {whispers.length === 0 && <p className="faint">No whispers yet.</p>}
        {whispers.map((w, i) => (
          <p key={i} style={{ margin: '0.2rem 0', fontStyle: 'italic' }}>
            {nameFor(w.fromUid)} → {nameFor(w.toUid)}: {w.message}
          </p>
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
