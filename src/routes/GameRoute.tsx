import { useAuth } from '../context/AuthContext'
import { useLobby } from '../context/LobbyContext'
import SecretRoleCard from '../components/game/SecretRoleCard'
import NightPhaseView from '../components/game/NightPhaseView'
import DayPhaseView from '../components/game/DayPhaseView'
import GhostTipComposer from '../components/game/GhostTipComposer'
import GhostTipFeed from '../components/game/GhostTipFeed'
import CycleLog from '../components/game/CycleLog'
import EndGameView from '../components/game/EndGameView'
import LeaveGameButton from '../components/game/LeaveGameButton'
import HostDevPanel from '../components/devpanel/HostDevPanel'

export default function GameRoute() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()

  if (!lobby || !uid) return null

  const me = players.find((p) => p.uid === uid)
  const isDrBright = lobby.hostUid === uid && me?.displayName === 'Dr. Bright'

  if (lobby.phase === 'ended') {
    return (
      <div>
        <EndGameView />
        {isDrBright && <HostDevPanel />}
      </div>
    )
  }

  return (
    <div>
      <h1>
        Cycle {lobby.cycle} — {lobby.phase === 'overtime' ? 'Overtime' : lobby.phase}
      </h1>
      <SecretRoleCard />
      {lobby.phase === 'night' && <NightPhaseView />}
      {(lobby.phase === 'day' || lobby.phase === 'overtime') && <DayPhaseView />}
      {!me?.alive && <GhostTipComposer />}
      <GhostTipFeed />
      <CycleLog />
      {me?.alive && <LeaveGameButton />}
      {isDrBright && <HostDevPanel />}
    </div>
  )
}
