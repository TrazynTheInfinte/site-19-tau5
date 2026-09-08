import { useState } from 'react'
import { useGameState } from '../../context/GameStateContext'
import { ROLE_DEFINITIONS } from '../../game/types'
import YourRolePanel from './YourRolePanel'

/** Replaces the old always-present sidebar card with a small button, freeing up sidebar space -
 * the role info itself (SecretRoleCard) is unchanged, just shown in a modal on demand now. */
export default function YourRoleButton() {
  const { myRole } = useGameState()
  const [open, setOpen] = useState(false)

  if (!myRole) return null
  const def = ROLE_DEFINITIONS[myRole.role]

  return (
    <>
      <button onClick={() => setOpen(true)} className={`faction-${def.faction}`}>
        🎭 {def.name}
      </button>
      {open && <YourRolePanel onClose={() => setOpen(false)} />}
    </>
  )
}
