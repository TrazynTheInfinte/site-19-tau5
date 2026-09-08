import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { setPuppeteerOverride } from '../../firebase/repository/gameplayRepository'

/** Shown only to the Puppeteer, only while alive, unused, and during a 'judgment' phase - that's
 * the vote that actually decides someone's fate, which fits "secretly control someone's fate"
 * better than manipulating who merely gets accused. Excludes the accused themselves from the
 * target-voter list - they don't get a judgment vote to hijack in the first place. */
export default function PuppeteerControl() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [targetVoterUid, setTargetVoterUid] = useState('')
  const [forcedVerdict, setForcedVerdict] = useState<'guilty' | 'innocent' | ''>('')
  const [used, setUsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!uid || !lobby || !myRole || myRole.role !== 'puppeteer' || myRole.specialUsed) return null
  if (lobby.phase !== 'judgment' || !lobby.trial?.accusedUid) return null

  const accusedUid = lobby.trial.accusedUid
  const others = players.filter((p) => p.alive && p.uid !== uid && p.uid !== accusedUid)

  async function handleSubmit() {
    if (!targetVoterUid || !forcedVerdict) return
    try {
      await setPuppeteerOverride(lobby!.code, {
        cycle: lobby!.cycle,
        trialNumber: lobby!.trial!.trialNumber,
        puppeteerUid: uid!,
        targetVoterUid,
        forcedVerdict,
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
        <p>Override set for this verdict. They'll never know.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>Puppeteer (once per game)</h3>
      <p>Secretly force a player's judgment vote this trial. They won't see any difference.</p>
      <select value={targetVoterUid} onChange={(e) => setTargetVoterUid(e.target.value)}>
        <option value="">-- whose vote to control --</option>
        {others.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.displayName}
          </option>
        ))}
      </select>
      {' votes '}
      <select value={forcedVerdict} onChange={(e) => setForcedVerdict(e.target.value as 'guilty' | 'innocent' | '')}>
        <option value="">-- forced verdict --</option>
        <option value="guilty">Guilty</option>
        <option value="innocent">Innocent</option>
      </select>
      <button disabled={!targetVoterUid || !forcedVerdict} onClick={handleSubmit} style={{ marginLeft: '0.5rem' }}>
        Set override
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
