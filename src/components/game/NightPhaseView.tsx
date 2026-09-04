import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { submitNightAction } from '../../firebase/repository/gameplayRepository'
import { nightAbilityFor } from '../../game/nightActionAbilities'
import type { NightActionType } from '../../game/types'

const ACTION_LABEL: Record<NightActionType, string> = {
  investigate: 'Investigate',
  protect: 'Protect',
  kill: 'Eliminate',
  block: 'Block',
}

export default function NightPhaseView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [targetUid, setTargetUid] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSubmitted(false)
    setTargetUid('')
  }, [lobby?.cycle])

  if (!uid || !lobby || !myRole) return <p>Loading night phase...</p>

  const ability = nightAbilityFor(myRole.role)
  const usedUp = myRole.role === 'saboteur' && myRole.saboteurUsed

  if (!ability || usedUp) {
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>You have no action tonight. Waiting on other players...</p>
      </div>
    )
  }

  const targets = players.filter((p) => p.alive && p.uid !== uid)

  async function handleSubmit() {
    if (!targetUid) return
    try {
      await submitNightAction(lobby!.code, {
        cycle: lobby!.cycle,
        actorUid: uid!,
        actionType: ability!,
        targetUid,
      })
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit action')
    }
  }

  if (submitted) {
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>Action submitted. Waiting on other players...</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Night phase</h2>
      <p>{ACTION_LABEL[ability]} who?</p>
      <select value={targetUid} onChange={(e) => setTargetUid(e.target.value)}>
        <option value="">-- choose a target --</option>
        {targets.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.displayName}
          </option>
        ))}
      </select>
      <button disabled={!targetUid} onClick={handleSubmit} style={{ marginLeft: '0.5rem' }}>
        Submit
      </button>
      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
    </div>
  )
}
