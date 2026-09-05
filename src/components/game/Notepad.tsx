import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { getNotepad, setNotepad } from '../../notes/localGameNotes'

/** Private scratchpad, local to this browser only — never synced anywhere. */
export default function Notepad() {
  const { uid } = useAuth()
  const { lobby } = useLobby()
  const [text, setText] = useState(() => (lobby && uid ? getNotepad(lobby.code, uid) : ''))

  if (!lobby || !uid) return null

  return (
    <div className="card">
      <h3>Notepad (private, only visible to you)</h3>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setNotepad(lobby.code, uid, e.target.value)
        }}
        rows={5}
        style={{ width: '100%', resize: 'vertical' }}
        placeholder="Track your theories here..."
      />
    </div>
  )
}
