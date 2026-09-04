import { useGameState } from '../../context/GameStateContext'
import { ROLE_DEFINITIONS } from '../../game/types'

export default function SecretRoleCard() {
  const { myRole, myNightResult } = useGameState()

  if (!myRole) return null
  const def = ROLE_DEFINITIONS[myRole.role]

  return (
    <div className="card">
      <h2>Your role</h2>
      <p>
        <strong className={`faction-${def.faction}`}>{def.name}</strong> ({def.faction})
      </p>
      {myRole.role === 'theMarked' && myRole.markedTargetUid && (
        <p>Your target's elimination wins the game for you.</p>
      )}
      {myNightResult?.payload.type === 'investigate' && (
        <p>
          Last night's investigation: target is <strong>{myNightResult.payload.targetFaction}</strong>.
        </p>
      )}
    </div>
  )
}
