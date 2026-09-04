import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { submitVote } from '../../firebase/repository/gameplayRepository'

export default function DayPhaseView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { currentVotes } = useGameState()
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (!lobby?.phaseDeadline) return
    const tick = () => setRemainingMs(Math.max(0, lobby.phaseDeadline! - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lobby?.phaseDeadline])

  if (!uid || !lobby) return null

  const isOvertime = lobby.phase === 'overtime'
  const me = players.find((p) => p.uid === uid)
  const myVote = currentVotes.find((v) => v.voterUid === uid)
  const living = players.filter((p) => p.alive)

  const tallyByTarget = new Map<string, number>()
  currentVotes.forEach((v) => {
    if (v.targetUid) tallyByTarget.set(v.targetUid, (tallyByTarget.get(v.targetUid) ?? 0) + 1)
  })

  async function castVote(targetUid: string | null) {
    if (!uid || !lobby) return
    await submitVote(lobby.code, { cycle: lobby.cycle, voterUid: uid, targetUid })
  }

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="card">
      <h2>{isOvertime ? 'Overtime vote' : 'Day phase'}</h2>
      <p>Time remaining: {seconds}s</p>
      {isOvertime && <p>Sudden death: every living player must vote, no abstaining.</p>}

      {!me?.alive ? (
        <p>You're a ghost — you can't vote, but you can send a tip below.</p>
      ) : myVote ? (
        <p>You voted for {myVote.targetUid ? players.find((p) => p.uid === myVote.targetUid)?.displayName : 'abstain'}.</p>
      ) : (
        <div>
          {living
            .filter((p) => p.uid !== uid)
            .map((p) => (
              <button key={p.uid} onClick={() => castVote(p.uid)} style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}>
                Vote {p.displayName} ({tallyByTarget.get(p.uid) ?? 0})
              </button>
            ))}
          {!isOvertime && <button onClick={() => castVote(null)}>Abstain</button>}
        </div>
      )}
    </div>
  )
}
