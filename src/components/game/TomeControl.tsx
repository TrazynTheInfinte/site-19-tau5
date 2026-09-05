import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { getAllSecretRoles, requestTomeTransfer } from '../../firebase/repository/gameplayRepository'

/** Shown only to the current Tome holder, during day/overtime. Lets them hand it off to a
 * living CI teammate - applied by the host resolver on its next poll, not instantly. */
export default function TomeControl() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [teammateUids, setTeammateUids] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const [requested, setRequested] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRequested(false)
    setTarget('')
  }, [lobby?.tomeHolderUid])

  useEffect(() => {
    if (!lobby || !uid || lobby.tomeHolderUid !== uid) {
      setTeammateUids([])
      return
    }
    let cancelled = false
    getAllSecretRoles(lobby.code).then((roles) => {
      if (cancelled) return
      setTeammateUids([...roles.values()].filter((r) => r.faction === 'ci' && r.uid !== uid).map((r) => r.uid))
    })
    return () => {
      cancelled = true
    }
  }, [lobby, uid])

  if (!lobby || !uid || lobby.tomeHolderUid !== uid) return null

  const livingTeammates = players.filter((p) => p.alive && teammateUids.includes(p.uid))
  if (livingTeammates.length === 0) return null

  async function handleRequest() {
    if (!target) return
    try {
      await requestTomeTransfer(lobby!.code, uid!, target)
      setRequested(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to hand off the Tome')
    }
  }

  if (requested) {
    return (
      <div className="card">
        <h3>The Tome</h3>
        <p>Hand-off requested — it'll take effect shortly.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>The Tome</h3>
      <p>You hold it. Hand it off to a teammate?</p>
      <select value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">-- keep it --</option>
        {livingTeammates.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.displayName}
          </option>
        ))}
      </select>
      <button disabled={!target} onClick={handleRequest} style={{ marginLeft: '0.5rem' }}>
        Hand off
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
