import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby } from '../../context/LobbyContext'
import { subscribeMyNightResults } from '../../firebase/repository/gameplayRepository'
import type { NightResultDoc } from '../../firebase/schema'
import type { Faction } from '../../game/types'

const ABILITY_LABEL: Record<NightResultDoc['payload']['type'], string> = {
  investigate: 'Investigate',
  track: 'Track',
}

const FACTION_LABEL: Record<Faction, string> = {
  foundation: 'Foundation',
  ci: 'Chaos Insurgency',
  serpentsHand: "Serpent's Hand",
}

function resultText(payload: NightResultDoc['payload']): string {
  return payload.type === 'investigate' ? FACTION_LABEL[payload.targetFaction] : payload.acted ? 'Acted' : 'No action'
}

/** Auto-populated, read-only record of every ability result this player has received -
 * distinct from the free-text notepad below it, since appending into text someone might be
 * actively editing would be a good way to clobber their own notes. */
export default function AbilityLog() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const [results, setResults] = useState<NightResultDoc[]>([])

  useEffect(() => {
    if (!lobby || !uid) return
    return subscribeMyNightResults(lobby.code, uid, setResults)
  }, [lobby, uid])

  if (results.length === 0) return null

  const nameFor = (targetUid: string) => players.find((p) => p.uid === targetUid)?.displayName ?? targetUid

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <span className="field-label">Ability log</span>
      <ul className="plain" style={{ fontSize: '0.85rem' }}>
        {results.map((r) => (
          <li key={r.cycle} style={{ padding: '0.2rem 0' }}>
            Night {r.cycle}: {ABILITY_LABEL[r.payload.type]} — {nameFor(r.payload.targetUid)} —{' '}
            <strong>{resultText(r.payload)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
