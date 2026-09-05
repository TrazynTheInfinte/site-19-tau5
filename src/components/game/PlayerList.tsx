import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby, type PlayerWithId } from '../../context/LobbyContext'
import { subscribeWill } from '../../firebase/repository/gameplayRepository'
import { getSuspicion, setSuspicion, type Suspicion } from '../../notes/localGameNotes'

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
    <div style={{ marginTop: '0.25rem', paddingLeft: '1rem', fontStyle: 'italic', opacity: 0.85 }}>
      Will: "{text}"
    </div>
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

export default function PlayerList() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()

  if (!lobby || !uid) return null

  const sorted: PlayerWithId[] = [...players].sort((a, b) => Number(b.alive) - Number(a.alive))

  return (
    <div className="card">
      <h3>Players</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sorted.map((p) => (
          <li key={p.uid} style={{ marginBottom: '0.5rem', opacity: p.alive ? 1 : 0.6 }}>
            <span>{p.alive ? '🟢' : '💀'}</span> {p.displayName}
            {!p.connected && ' (disconnected)'}
            {p.uid !== uid && (
              <SuspicionSelect lobbyCode={lobby.code} viewerUid={uid} targetUid={p.uid} />
            )}
            {!p.alive && <RevealedWill lobbyId={lobby.code} uid={p.uid} />}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: '0.85em', opacity: 0.7 }}>
        Suspicions are your own private notes — only you can see them.
      </p>
    </div>
  )
}
