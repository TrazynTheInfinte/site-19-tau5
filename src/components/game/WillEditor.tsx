import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { setMyWill, subscribeWill } from '../../firebase/repository/gameplayRepository'

/** Shown only while alive - the will locks (write access revoked) the moment you're eliminated. */
export default function WillEditor() {
  const { uid } = useAuth()
  const { lobbyId } = useLobby()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!lobbyId || !uid) return
    return subscribeWill(lobbyId, uid, (will) => setText(will?.text ?? ''))
  }, [lobbyId, uid])

  async function handleSave() {
    if (!lobbyId || !uid) return
    setSaving(true)
    try {
      await setMyWill(lobbyId, uid, text)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h3>Your will</h3>
      <p>Revealed to everyone if you're eliminated. Locked at the moment you die, so keep it updated while you can.</p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
        }}
        maxLength={500}
        rows={4}
        style={{ width: '100%', resize: 'vertical' }}
      />
      <br />
      <button onClick={handleSave} disabled={saved || saving} style={{ marginTop: '0.5rem' }}>
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save will'}
      </button>
    </div>
  )
}
