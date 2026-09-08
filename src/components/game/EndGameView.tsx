import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { setPlayerConnected } from '../../firebase/repository/lobbyRepository'
import { getAllSecretRoles } from '../../firebase/repository/gameplayRepository'
import { restartGame } from '../../host/restartGame'
import { ROLE_DEFINITIONS, type RoleAssignments } from '../../game/types'
import { ROLE_ICONS } from '../../game/roleIcons'
import Icon from '../icons/Icon'
import CycleLog from './CycleLog'

const WINNER_LABEL: Record<string, string> = {
  foundation: 'The Foundation contained the threat.',
  ci: 'The Chaos Insurgency has taken control.',
  draw: 'Overtime expired with no resolution. Draw.',
}

const WINNER_COLOR: Record<string, string> = {
  foundation: 'var(--foundation)',
  ci: 'var(--ci)',
  draw: 'var(--text-muted)',
}

const CAUSE_LABEL: Record<string, string> = {
  vote: 'voted out',
  kill: 'killed at night',
  showdown: 'lost the Showdown',
}

export default function EndGameView() {
  const { uid } = useAuth()
  const { lobbyId, lobby, players } = useLobby()
  const { myRole, publicCycleLog } = useGameState()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allRoles, setAllRoles] = useState<RoleAssignments | null>(null)

  useEffect(() => {
    if (!lobbyId) return
    let cancelled = false
    getAllSecretRoles(lobbyId).then((roles) => {
      if (!cancelled) setAllRoles(roles)
    })
    return () => {
      cancelled = true
    }
  }, [lobbyId])

  if (!lobby || !lobbyId || !uid) return null
  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid
  const isHost = lobby.hostUid === uid
  const winnerColor = lobby.winner ? WINNER_COLOR[lobby.winner] : 'var(--text-muted)'
  const deathByUid = new Map(
    publicCycleLog.filter((e) => e.eliminatedUid).map((e) => [e.eliminatedUid as string, e]),
  )

  async function handleRestart() {
    setBusy(true)
    setError(null)
    try {
      await restartGame(lobbyId!, players.map((p) => p.uid), lobby!.gameNumber)
    } catch (e) {
      console.error('restartGame failed', e)
      setError(e instanceof Error ? e.message : 'Failed to restart game')
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    setBusy(true)
    try {
      await setPlayerConnected(lobbyId!, uid!, false)
      navigate('/')
    } catch {
      setBusy(false)
    }
  }

  return (
    <div>
      <div
        className="card end-screen-enter"
        style={{ borderColor: winnerColor, textAlign: 'center', padding: 'var(--space-4)' }}
      >
        <span className="field-label">Debrief</span>
        <h1 style={{ color: winnerColor, margin: 0 }}>{lobby.winner ? WINNER_LABEL[lobby.winner] : 'Unresolved'}</h1>
        {lobby.personalWinners.length > 0 && (
          <p style={{ marginTop: 'var(--space-3)' }}>
            {lobby.personalWinners.map((w) => (
              <span key={w} className="chip" style={{ color: 'var(--serpentshand)', marginRight: '0.4rem' }}>
                {nameFor(w)}
              </span>
            ))}
            <span className="faint"> — personal objective achieved</span>
          </p>
        )}
        {myRole && (
          <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
            You were <strong className={`faction-${myRole.faction}`}>{ROLE_DEFINITIONS[myRole.role].name}</strong>
          </p>
        )}
      </div>

      <div className="card end-screen-enter" style={{ animationDelay: '0.12s', animationFillMode: 'backwards' }}>
        <h3>Full roster</h3>
        {allRoles ? (
          <ul className="plain">
            {players.map((p) => {
              const assignment = allRoles.get(p.uid)
              if (!assignment) return null
              const def = ROLE_DEFINITIONS[assignment.role]
              const death = deathByUid.get(p.uid)
              return (
                <li
                  key={p.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <Icon svg={ROLE_ICONS[assignment.role]} size={18} className={`faction-${def.faction}`} />
                  <span style={{ minWidth: '120px' }}>{p.displayName}</span>
                  <span className={`faction-${def.faction}`}>{def.name}</span>
                  {death ? (
                    <span className="faint">
                      — {CAUSE_LABEL[death.causeOfDeath ?? ''] ?? 'eliminated'}, cycle {death.cycle}
                    </span>
                  ) : (
                    <span className="faint">— survived</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="faint">Loading...</p>
        )}
      </div>

      <div className="card">
        <h3>Cycle log</h3>
        <CycleLog />
      </div>

      <div className="card">
        {isHost ? (
          <button className="primary" disabled={busy} onClick={handleRestart}>
            {busy ? 'Restarting...' : 'Restart game (back to lobby)'}
          </button>
        ) : (
          <p className="muted">Waiting for the host to restart, or:</p>
        )}
        {!isHost && (
          <button disabled={busy} onClick={handleLeave}>
            {busy ? 'Leaving...' : 'Leave lobby'}
          </button>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
