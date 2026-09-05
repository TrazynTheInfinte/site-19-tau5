import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { getAllSecretRoles } from '../../firebase/repository/gameplayRepository'
import { ROLE_DEFINITIONS, type RoleAssignment } from '../../game/types'

export default function SecretRoleCard() {
  const { uid } = useAuth()
  const { lobbyId, players } = useLobby()
  const { myRole, myNightResult } = useGameState()
  const [teammates, setTeammates] = useState<RoleAssignment[]>([])

  useEffect(() => {
    if (!lobbyId || !uid || myRole?.faction !== 'ci') {
      setTeammates([])
      return
    }
    let cancelled = false
    // Rules grant CI-to-CI read access, so this naturally returns only self + CI teammates.
    getAllSecretRoles(lobbyId).then((roles) => {
      if (cancelled) return
      setTeammates([...roles.values()].filter((r) => r.uid !== uid))
    })
    return () => {
      cancelled = true
    }
  }, [lobbyId, uid, myRole?.faction])

  if (!myRole) return null
  const def = ROLE_DEFINITIONS[myRole.role]
  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid

  return (
    <div className="card">
      <h2>Your role</h2>
      <p>
        <strong className={`faction-${def.faction}`}>{def.name}</strong> ({def.faction})
      </p>
      {myRole.role === 'theMarked' && myRole.markedTargetUid && (
        <p>Your target's elimination wins the game for you.</p>
      )}
      {teammates.length > 0 && (
        <p>
          Chaos Insurgency teammates:{' '}
          {teammates.map((t) => `${nameFor(t.uid)} (${ROLE_DEFINITIONS[t.role].name})`).join(', ')}
        </p>
      )}
      {myNightResult?.payload.type === 'investigate' && (
        <p>
          Last night's investigation: target is <strong>{myNightResult.payload.targetFaction}</strong>.
        </p>
      )}
      {myNightResult?.payload.type === 'track' && (
        <p>
          Last night's tracking: target {myNightResult.payload.acted ? 'took an action' : 'did not act'}.
        </p>
      )}
    </div>
  )
}
