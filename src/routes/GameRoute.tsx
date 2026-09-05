import { useAuth } from '../context/AuthContext'
import { useLobby } from '../context/LobbyContext'
import SecretRoleCard from '../components/game/SecretRoleCard'
import BriefingView from '../components/game/BriefingView'
import NightPhaseView from '../components/game/NightPhaseView'
import DayPhaseView from '../components/game/DayPhaseView'
import GhostTipComposer from '../components/game/GhostTipComposer'
import GhostTipFeed from '../components/game/GhostTipFeed'
import CycleLog from '../components/game/CycleLog'
import EndGameView from '../components/game/EndGameView'
import LeaveGameButton from '../components/game/LeaveGameButton'
import PlayerList from '../components/game/PlayerList'
import WillEditor from '../components/game/WillEditor'
import Notepad from '../components/game/Notepad'
import AbilityLog from '../components/game/AbilityLog'
import PuppeteerControl from '../components/game/PuppeteerControl'
import TomeControl from '../components/game/TomeControl'
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

  // On a desktop-sized viewport, .game-shell arranges into a fixed-height, no-scroll sidebar
  // layout (see index.css); below that breakpoint the same markup just stacks and scrolls
  // like every other route, so nothing is hidden on a smaller window.
  return (
    <div className="game-shell">
      <div className={`phase-banner phase-banner--${lobby.phase}`}>
        <h1>{lobby.phase === 'overtime' ? 'Overtime' : lobby.phase}</h1>
        <span className="phase-banner__label">
          {lobby.phase === 'briefing' ? 'Before Night 1' : `Cycle ${lobby.cycle} / ${lobby.cycleCap}`}
        </span>
      </div>

      <div className="game-shell__body">
        <div className="game-shell__main">
          <SecretRoleCard />
          {lobby.phase === 'briefing' && <BriefingView />}
          {lobby.phase === 'night' && <NightPhaseView />}
          {(lobby.phase === 'day' || lobby.phase === 'overtime') && (
            <>
              <DayPhaseView />
              <PuppeteerControl />
              <TomeControl />
            </>
          )}
          {!me?.alive && <GhostTipComposer />}
          {isDrBright && <HostDevPanel />}
        </div>

        <div className="game-shell__sidebar">
          <PlayerList />
          <GhostTipFeed />
          {me?.alive && (
            <details className="card collapsible">
              <summary>Your will</summary>
              <WillEditor />
            </details>
          )}
          <details className="card collapsible" open>
            <summary>Notepad</summary>
            <AbilityLog />
            <Notepad />
          </details>
          <details className="card collapsible">
            <summary>Cycle log</summary>
            <CycleLog />
          </details>
          <LeaveGameButton />
        </div>
      </div>
    </div>
  )
}
