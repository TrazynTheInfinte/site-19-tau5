import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby, type PlayerWithId } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { getAllSecretRoles, subscribeRevealedRole, subscribeWill } from '../../firebase/repository/gameplayRepository'
import { getSuspicion, setSuspicion, type Suspicion } from '../../notes/localGameNotes'
import { ROLE_DEFINITIONS, type Faction, type RoleId } from '../../game/types'
import { ROLE_ICONS } from '../../game/roleIcons'
import Icon from '../icons/Icon'

const SUSPICION_LABEL: Record<Suspicion, string> = {
  unknown: 'Unknown',
  foundation: 'Foundation',
  ci: 'Chaos Insurgency',
  serpentsHand: "Serpent's Hand",
}

function RevealedWill({ lobbyId, uid }: { lobbyId: string; uid: string }) {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    return subscribeWill(lobbyId, uid, (will) => setText(will?.text ?? null))
  }, [lobbyId, uid])

  if (!text) return null
  return (
    <div style={{ width: '100%', paddingLeft: '1.1rem', fontStyle: 'italic', opacity: 0.85, fontSize: '0.88rem' }}>
      Will: "{text}"
    </div>
  )
}

function RevealedRole({ lobbyId, uid }: { lobbyId: string; uid: string }) {
  const [role, setRole] = useState<{ role: RoleId; faction: Faction } | null>(null)

  useEffect(() => {
    return subscribeRevealedRole(lobbyId, uid, (r) => setRole(r ? { role: r.role, faction: r.faction } : null))
  }, [lobbyId, uid])

  if (!role) return null
  const def = ROLE_DEFINITIONS[role.role]
  return (
    <span className={`faction-${role.faction}`} style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <Icon svg={ROLE_ICONS[role.role]} size={16} />({def?.name ?? role.role})
    </span>
  )
}

function SuspicionSelect({
  lobbyCode,
  viewerUid,
  targetUid,
}: {
  lobbyCode: string
  viewerUid: string
  targetUid: string
}) {
  const [value, setValue] = useState<Suspicion>(() => getSuspicion(lobbyCode, viewerUid, targetUid))

  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value as Suspicion
        setValue(next)
        setSuspicion(lobbyCode, viewerUid, targetUid, next)
      }}
      style={{ marginLeft: '0.5rem' }}
    >
      {(Object.keys(SUSPICION_LABEL) as Suspicion[]).map((s) => (
        <option key={s} value={s}>
          {SUSPICION_LABEL[s]}
        </option>
      ))}
    </select>
  )
}

/** Known CI teammates' roles, keyed by uid - CI players already know each other, so this
 * replaces the suspicion-guess dropdown with the actual role for those rows. */
function useCiTeammateRoles(lobbyId: string | undefined, uid: string | undefined, isCi: boolean) {
  const [roles, setRoles] = useState<Map<string, RoleId>>(new Map())

  useEffect(() => {
    if (!lobbyId || !uid || !isCi) {
      setRoles(new Map())
      return
    }
    let cancelled = false
    // Must re-filter to faction 'ci' client-side: a CI player who's also the host gets every
    // player's doc back via the host resolver's rules bypass, not just their teammates'.
    getAllSecretRoles(lobbyId).then((assignments) => {
      if (cancelled) return
      const next = new Map<string, RoleId>()
      for (const a of assignments.values()) {
        if (a.uid !== uid && a.faction === 'ci') next.set(a.uid, a.role)
      }
      setRoles(next)
    })
    return () => {
      cancelled = true
    }
  }, [lobbyId, uid, isCi])

  return roles
}

export default function PlayerList() {
  const { uid } = useAuth()
  const { lobbyId, lobby, players } = useLobby()
  const { myRole } = useGameState()
  const ciTeammateRoles = useCiTeammateRoles(lobbyId ?? undefined, uid ?? undefined, myRole?.faction === 'ci')

  if (!lobby || !uid) return null

  const sorted: PlayerWithId[] = [...players].sort((a, b) => Number(b.alive) - Number(a.alive))

  return (
    <div className="card">
      <h3>Personnel</h3>
      <ul className="plain">
        {sorted.map((p) => (
          <li
            key={p.uid}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0',
              borderBottom: '1px solid var(--border-default)',
              opacity: p.alive ? 1 : 0.7,
            }}
          >
            <span className={`status-dot ${!p.alive ? 'status-dot--dead' : ''}`} />
            <span>{p.displayName}</span>
            {!p.connected && <span className="faint">disconnected</span>}
            {!p.alive && <RevealedRole lobbyId={lobby.code} uid={p.uid} />}
            {p.uid !== uid && p.alive && ciTeammateRoles.has(p.uid) ? (
              <span className="faction-ci" style={{ marginLeft: '0.5rem' }}>
                ({ROLE_DEFINITIONS[ciTeammateRoles.get(p.uid)!].name})
              </span>
            ) : (
              p.uid !== uid && <SuspicionSelect lobbyCode={lobby.code} viewerUid={uid} targetUid={p.uid} />
            )}
            {!p.alive && <RevealedWill lobbyId={lobby.code} uid={p.uid} />}
          </li>
        ))}
      </ul>
      <p className="faint" style={{ marginTop: 'var(--space-2)' }}>
        Suspicions are your own private notes — only you can see them.
      </p>
    </div>
  )
}
