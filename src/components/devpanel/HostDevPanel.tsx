import { useState } from 'react'
import { useLobby } from '../../context/LobbyContext'
import { getAllSecretRoles } from '../../firebase/repository/gameplayRepository'
import { updateLobby } from '../../firebase/repository/lobbyRepository'
import { devKillPlayer, resolveNightCycle } from '../../host/resolver'
import { ROLE_DEFINITIONS, type RoleAssignments } from '../../game/types'
import type { LobbyDoc } from '../../firebase/schema'

/** Testing-only panel, unlocked when the host's display name is exactly "Dr. Bright". Not a security boundary. */
export default function HostDevPanel() {
  const { lobbyId, lobby, players } = useLobby()
  const [roles, setRoles] = useState<RoleAssignments | null>(null)

  if (!lobbyId || !lobby) return null

  async function revealAllRoles() {
    setRoles(await getAllSecretRoles(lobbyId!))
  }

  async function forceResolveNight() {
    if (lobby!.phase !== 'night') return
    await resolveNightCycle(lobbyId!, lobby!, players)
  }

  const TIMED_PHASES: LobbyDoc['phase'][] = ['briefing', 'discussion', 'accusation', 'defense', 'judgment', 'overtime']

  async function forceExpireTimer() {
    if (!TIMED_PHASES.includes(lobby!.phase)) return
    await updateLobby(lobbyId!, { phaseDeadline: Date.now() - 1 })
  }

  async function killPlayer(targetUid: string) {
    await devKillPlayer(lobbyId!, lobby!, players, targetUid)
  }

  const living = players.filter((p) => p.alive)

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <h3>[Dr. Bright dev panel]</h3>
      <button onClick={revealAllRoles}>Reveal all roles</button>{' '}
      <button onClick={forceResolveNight}>Force resolve night now</button>{' '}
      <button onClick={forceExpireTimer}>Force expire discussion/voting/briefing/overtime timer</button>

      {roles && (
        <ul>
          {[...roles.values()].map((a) => (
            <li key={a.uid}>
              {players.find((p) => p.uid === a.uid)?.displayName ?? a.uid}: {ROLE_DEFINITIONS[a.role].name}
            </li>
          ))}
        </ul>
      )}

      {lobby.phase !== 'ended' && living.length > 0 && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <p className="faint">Kill (instant, runs the same bookkeeping a real death would):</p>
          {living.map((p) => (
            <button
              key={p.uid}
              className="danger"
              style={{ marginRight: '0.4rem', marginBottom: '0.4rem' }}
              onClick={() => killPlayer(p.uid)}
            >
              Kill {p.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
