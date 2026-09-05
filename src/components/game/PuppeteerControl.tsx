import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { setPuppeteerOverride } from '../../firebase/repository/gameplayRepository'

/** Shown only to the Puppeteer, only while alive and unused. Secretly overrides another
 * living player's vote for the host's tally - the victim's own vote display never changes. */
export default function PuppeteerControl() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [targetVoterUid, setTargetVoterUid] = useState('')
  const [forcedTarget, setForcedTarget] = useState('')
  const [used, setUsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!uid || !lobby || !myRole || myRole.role !== 'puppeteer' || myRole.specialUsed) return null

  const living = players.filter((p) => p.alive)
  const others = living.filter((p) => p.uid !== uid)

  async function handleSubmit() {
    if (!targetVoterUid || !forcedTarget) return
    try {
      await setPuppeteerOverride(lobby!.code, {
        cycle: lobby!.cycle,
        puppeteerUid: uid!,
        targetVoterUid,
        forcedTarget,
      })
      setUsed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set override')
    }
  }

  if (used) {
    return (
      <div className="card">
        <h3>Puppeteer</h3>
        <p>Override set for this vote. They'll never know.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>Puppeteer (once per game)</h3>
      <p>Secretly force a player's vote this cycle. They won't see any difference.</p>
      <select value={targetVoterUid} onChange={(e) => setTargetVoterUid(e.target.value)}>
        <option value="">-- whose vote to control --</option>
        {others.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.displayName}
          </option>
        ))}
      </select>
      {' vote counts for '}
      <select value={forcedTarget} onChange={(e) => setForcedTarget(e.target.value)}>
        <option value="">-- forced target --</option>
        {living.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.displayName}
          </option>
        ))}
      </select>
      <button disabled={!targetVoterUid || !forcedTarget} onClick={handleSubmit} style={{ marginLeft: '0.5rem' }}>
        Set override
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
