import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { getAllSecretRoles } from '../../firebase/repository/gameplayRepository'
import { ROLE_DEFINITIONS, type RoleAssignment } from '../../game/types'
import { ROLE_DESCRIPTIONS } from '../../game/roleDescriptions'
import RoleBadge from './RoleBadge'

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
      <h3>Your role</h3>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <RoleBadge role={myRole.role} faction={myRole.faction} />
        <div>
          <strong className={`faction-${def.faction}`} style={{ fontSize: '1.05rem' }}>
            {def.name}
          </strong>
          <div className={`faction-${def.faction}`} style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {def.faction === 'serpentsHand' ? "Serpent's Hand" : def.faction === 'ci' ? 'Chaos Insurgency' : 'Foundation'}
          </div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
        {ROLE_DESCRIPTIONS[myRole.role]}
      </p>

      {myRole.role === 'theMarked' && myRole.markedTargetUid && (
        <p className="faint">Your target's elimination wins the game for you.</p>
      )}
      {teammates.length > 0 && (
        <p className="faint">
          Chaos Insurgency teammates:{' '}
          {teammates.map((t) => `${nameFor(t.uid)} (${ROLE_DEFINITIONS[t.role].name})`).join(', ')}
        </p>
      )}
      {myRole.role === 'enforcer' && (
        <p className="faint">
          {myRole.gunJammed ? 'Your weapon is jammed - no more loading or shooting.' : `Bullets loaded: ${myRole.bulletsLoaded}/2`}
        </p>
      )}
      {myRole.role === 'whisperer' && myRole.senseTargetUid && (
        <p className="faint">Currently sensing: {nameFor(myRole.senseTargetUid)}</p>
      )}
      {myRole.role === 'cultivator' && (
        <p className="faint">
          Seeded: {myRole.seededUids.length > 0 ? myRole.seededUids.map(nameFor).join(', ') : 'no one yet'}
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
      {myNightResult?.payload.type === 'sense' && (
        <p>
          Last night's sensing: {myNightResult.payload.visited ? `visited ${nameFor(myNightResult.payload.visited)}` : 'visited no one'};{' '}
          {myNightResult.payload.visitedBy.length > 0
            ? `visited by ${myNightResult.payload.visitedBy.map(nameFor).join(', ')}`
            : 'visited by no one'}
          .
        </p>
      )}
    </div>
  )
}
