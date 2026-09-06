import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLobby, type PlayerWithId } from '../../context/LobbyContext'
import { useGameState } from '../../context/GameStateContext'
import { getAllSecretRoles, submitNightAction } from '../../firebase/repository/gameplayRepository'
import { nightAbilityFor } from '../../game/nightActionAbilities'
import { seedTargetCount, type NightActionType } from '../../game/types'

const ACTION_LABEL: Record<NightActionType, string> = {
  investigate: 'Investigate',
  protect: 'Protect',
  kill: 'Eliminate',
  block: 'Block',
  track: 'Track',
  detain: 'Detain',
  execute: 'Execute',
  frame: 'Frame',
  trueKill: 'Strike',
  cartographerSwap: 'Swap',
  load: 'Load',
  sense: 'Sense',
  seed: 'Seed',
}

function TargetSelect({
  targets,
  value,
  onChange,
}: {
  targets: PlayerWithId[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- choose a target --</option>
      {targets.map((p) => (
        <option key={p.uid} value={p.uid}>
          {p.displayName}
        </option>
      ))}
    </select>
  )
}

function SubmittedCard() {
  return (
    <div className="card">
      <h2>Night phase</h2>
      <p>Action submitted. Waiting on other players...</p>
    </div>
  )
}

function NoActionCard() {
  return (
    <div className="card">
      <h2>Night phase</h2>
      <p>You have no action tonight. Waiting on other players...</p>
    </div>
  )
}

export default function NightPhaseView() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()
  const [targetUid, setTargetUid] = useState('')
  const [secondaryTargetUid, setSecondaryTargetUid] = useState('')
  const [wardenExecute, setWardenExecute] = useState(false)
  const [enforcerShoot, setEnforcerShoot] = useState(false)
  const [useTome, setUseTome] = useState(false)
  const [ciTeammateUids, setCiTeammateUids] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSubmitted(false)
    setTargetUid('')
    setSecondaryTargetUid('')
    setWardenExecute(false)
    setEnforcerShoot(false)
    setUseTome(false)
  }, [lobby?.cycle])

  useEffect(() => {
    if (!lobby || myRole?.role !== 'anomaly') return
    let cancelled = false
    getAllSecretRoles(lobby.code).then((roles) => {
      if (cancelled) return
      setCiTeammateUids(new Set([...roles.values()].filter((r) => r.faction === 'ci').map((r) => r.uid)))
    })
    return () => {
      cancelled = true
    }
  }, [lobby, myRole?.role])

  if (!uid || !lobby || !myRole) return <p>Loading night phase...</p>

  const others = players.filter((p) => p.alive && p.uid !== uid)
  const holdsTome = myRole.faction === 'ci' && uid === lobby.tomeHolderUid

  async function submit(actionType: NightActionType, target: string, secondaryTarget?: string) {
    try {
      await submitNightAction(lobby!.code, {
        cycle: lobby!.cycle,
        actorUid: uid!,
        actionType,
        targetUid: target,
        ...(secondaryTarget ? { secondaryTargetUid: secondaryTarget } : {}),
      })
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit action')
    }
  }

  if (submitted) return <SubmittedCard />

  // --- Warden: always has Detain; Execute is a once-per-game alternative on the same target ---
  if (myRole.role === 'warden') {
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>{wardenExecute ? 'Execute who? (unblockable, once per game)' : 'Detain who?'}</p>
        <TargetSelect targets={others} value={targetUid} onChange={setTargetUid} />
        {!myRole.specialUsed && (
          <label style={{ marginLeft: '0.5rem' }}>
            <input type="checkbox" checked={wardenExecute} onChange={(e) => setWardenExecute(e.target.checked)} />{' '}
            Execute instead
          </label>
        )}
        <button
          disabled={!targetUid}
          onClick={() => submit(wardenExecute ? 'execute' : 'detain', targetUid)}
          style={{ marginLeft: '0.5rem' }}
        >
          Submit
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  // --- Anomaly: optional once-per-game bypass-kill (not usable cycle 1, can't target CI),
  // plus a separate, repeatable Tome-kill if they happen to be holding it ---
  if (myRole.role === 'anomaly') {
    const canStrike = !myRole.specialUsed && lobby.cycle > 1
    if (!canStrike && !holdsTome) return <NoActionCard />
    const validTargets = others.filter((p) => !ciTeammateUids.has(p.uid))
    return (
      <div className="card">
        <h2>Night phase</h2>
        {canStrike && (
          <>
            <p>Strike a target? (unblockable, once per game, can't target Chaos Insurgency)</p>
            <TargetSelect targets={validTargets} value={targetUid} onChange={setTargetUid} />
            <button
              disabled={!targetUid}
              onClick={() => submit('trueKill', targetUid)}
              style={{ marginLeft: '0.5rem' }}
            >
              Strike
            </button>
            <p style={{ fontSize: '0.85em', opacity: 0.7 }}>You may also skip this and act again later.</p>
          </>
        )}
        {holdsTome && (
          <>
            <p>Or use the Tome to kill (repeatable, doesn't touch your own once-per-game strike):</p>
            <TargetSelect targets={others} value={secondaryTargetUid} onChange={setSecondaryTargetUid} />
            <button
              disabled={!secondaryTargetUid}
              onClick={() => submit('kill', secondaryTargetUid)}
              style={{ marginLeft: '0.5rem' }}
            >
              Kill via Tome
            </button>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  // --- Enforcer: Load (repeatable, capped at 2) or Shoot (blockable kill, consumes a
  // bullet, can't shoot Night 1) - jammed forever after killing a Foundation member ---
  if (myRole.role === 'enforcer') {
    if (myRole.gunJammed) return <NoActionCard />
    const canShoot = myRole.bulletsLoaded > 0 && lobby.cycle > 1
    const maxedOut = myRole.bulletsLoaded >= 2
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>
          {enforcerShoot
            ? 'Shoot who? (a normal, blockable kill - consumes a bullet either way)'
            : `Load your weapon (${myRole.bulletsLoaded}/2 loaded)`}
        </p>
        {enforcerShoot && <TargetSelect targets={others} value={targetUid} onChange={setTargetUid} />}
        {canShoot && (
          <label style={{ marginLeft: '0.5rem' }}>
            <input type="checkbox" checked={enforcerShoot} onChange={(e) => setEnforcerShoot(e.target.checked)} />{' '}
            Shoot instead
          </label>
        )}
        <button
          disabled={enforcerShoot ? !targetUid : maxedOut}
          onClick={() => submit(enforcerShoot ? 'kill' : 'load', enforcerShoot ? targetUid : uid)}
          style={{ marginLeft: '0.5rem' }}
        >
          Submit
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  // --- Whisperer: locks in a sense target once, then passively receives results every night
  // (no further action needed) until that target dies ---
  if (myRole.role === 'whisperer') {
    if (myRole.senseTargetUid) {
      const targetName = players.find((p) => p.uid === myRole.senseTargetUid)?.displayName ?? 'your target'
      return (
        <div className="card">
          <h2>Night phase</h2>
          <p>Currently sensing {targetName}. No action needed — results arrive automatically each night.</p>
        </div>
      )
    }
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>Choose someone to sense (locks in until they die):</p>
        <TargetSelect targets={others} value={targetUid} onChange={setTargetUid} />
        <button disabled={!targetUid} onClick={() => submit('sense', targetUid)} style={{ marginLeft: '0.5rem' }}>
          Sense
        </button>
        <p style={{ fontSize: '0.85em', opacity: 0.7 }}>You may also skip this and choose later.</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  // --- Cultivator: spreads the seed until the target count is reached, then hunts the seeded ---
  if (myRole.role === 'cultivator') {
    const requiredSeeds = seedTargetCount(players.length)
    const seedFull = myRole.seededUids.length >= requiredSeeds
    if (!seedFull) {
      const seedTargets = others.filter((p) => !myRole.seededUids.includes(p.uid))
      if (seedTargets.length === 0) return <NoActionCard />
      return (
        <div className="card">
          <h2>Night phase</h2>
          <p>
            Spread the seed to a target ({myRole.seededUids.length}/{requiredSeeds} seeded so far):
          </p>
          <TargetSelect targets={seedTargets} value={targetUid} onChange={setTargetUid} />
          <button disabled={!targetUid} onClick={() => submit('seed', targetUid)} style={{ marginLeft: '0.5rem' }}>
            Seed
          </button>
          <p style={{ fontSize: '0.85em', opacity: 0.7 }}>You may also skip this and seed someone else later.</p>
          {error && <p className="error-text">{error}</p>}
        </div>
      )
    }
    const huntTargets = others.filter((p) => myRole.seededUids.includes(p.uid))
    if (huntTargets.length === 0) return <NoActionCard />
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>Hunt one of your seeded targets (a normal, blockable kill):</p>
        <TargetSelect targets={huntTargets} value={targetUid} onChange={setTargetUid} />
        <button disabled={!targetUid} onClick={() => submit('kill', targetUid)} style={{ marginLeft: '0.5rem' }}>
          Kill
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  // --- Cartographer: optional once-per-game target swap between two other players ---
  if (myRole.role === 'cartographer') {
    if (myRole.specialUsed) return <NoActionCard />
    const secondTargets = others.filter((p) => p.uid !== targetUid)
    return (
      <div className="card">
        <h2>Night phase</h2>
        <p>Swap the night-action targets of two players (they won't know), once per game:</p>
        <TargetSelect targets={others} value={targetUid} onChange={setTargetUid} />
        {' & '}
        <TargetSelect targets={secondTargets} value={secondaryTargetUid} onChange={setSecondaryTargetUid} />
        <button
          disabled={!targetUid || !secondaryTargetUid}
          onClick={() => submit('cartographerSwap', targetUid, secondaryTargetUid)}
          style={{ marginLeft: '0.5rem' }}
        >
          Swap
        </button>
        <p style={{ fontSize: '0.85em', opacity: 0.7 }}>You may also skip this and act again later.</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  // --- Everyone else: a single required action, if their role has one - CI holders of the
  // Tome may use it to kill instead of their normal ability ---
  const ability = nightAbilityFor(myRole.role)
  const abilityUsedUp = myRole.role === 'saboteur' && myRole.saboteurUsed
  const canUseNormalAbility = ability !== null && !abilityUsedUp
  if (!canUseNormalAbility && !holdsTome) return <NoActionCard />

  const showTomeToggle = holdsTome && ability !== 'kill' && canUseNormalAbility
  const forcedTome = holdsTome && !canUseNormalAbility
  const actingViaTome = forcedTome || (showTomeToggle && useTome)
  const effectiveAction: NightActionType = actingViaTome ? 'kill' : (ability as NightActionType)

  return (
    <div className="card">
      <h2>Night phase</h2>
      <p>{actingViaTome ? 'Eliminate who? (via the Tome)' : `${ACTION_LABEL[effectiveAction]} who?`}</p>
      <TargetSelect targets={others} value={targetUid} onChange={setTargetUid} />
      {showTomeToggle && (
        <label style={{ marginLeft: '0.5rem' }}>
          <input type="checkbox" checked={useTome} onChange={(e) => setUseTome(e.target.checked)} /> Use the Tome to
          kill instead
        </label>
      )}
      <button
        disabled={!targetUid}
        onClick={() => submit(effectiveAction, targetUid)}
        style={{ marginLeft: '0.5rem' }}
      >
        Submit
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
