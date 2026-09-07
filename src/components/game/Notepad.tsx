import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { getNotepad, setNotepad } from '../../notes/localGameNotes'

/** Private scratchpad, local to this browser only — never synced anywhere. */
export default function Notepad() {
  const { uid } = useAuth()
  const { lobby } = useLobby()
  const [text, setText] = useState(() => (lobby && uid ? getNotepad(lobby.code, lobby.gameNumber, uid) : ''))

  // The component stays mounted across a restart (same lobby, new game), so the lazy
  // useState initializer above only ever reads once - this re-syncs when gameNumber changes.
  useEffect(() => {
    if (lobby && uid) setText(getNotepad(lobby.code, lobby.gameNumber, uid))
  }, [lobby?.code, lobby?.gameNumber, uid])

  if (!lobby || !uid) return null

  return (
    <>
      <p className="faint">Private — only visible to you.</p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setNotepad(lobby.code, lobby.gameNumber, uid, e.target.value)
        }}
        rows={5}
        placeholder="Track your theories here..."
      />
    </>
  )
}
