import { useState } from 'react'
import { useLobby } from '../../context/LobbyContext'
import { getAllSecretRoles } from '../../firebase/repository/gameplayRepository'
import { updateLobby } from '../../firebase/repository/lobbyRepository'
import { resolveNightCycle } from '../../host/resolver'
import { ROLE_DEFINITIONS, type RoleAssignments } from '../../game/types'

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

  async function forceExpireTimer() {
    const phase = lobby!.phase
    if (phase !== 'discussion' && phase !== 'voting' && phase !== 'overtime' && phase !== 'briefing') return
    await updateLobby(lobbyId!, { phaseDeadline: Date.now() - 1 })
  }

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
    </div>
  )
}
