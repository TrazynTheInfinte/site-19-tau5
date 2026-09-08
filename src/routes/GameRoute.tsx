import { useAuth } from '../context/AuthContext'
import { useLobby } from '../context/LobbyContext'
import { useGameState } from '../context/GameStateContext'
import SecretRoleCard from '../components/game/SecretRoleCard'
import BriefingView from '../components/game/BriefingView'
import NightPhaseView from '../components/game/NightPhaseView'
import DiscussionView from '../components/game/DiscussionView'
import AccusationView from '../components/game/AccusationView'
import DefenseView from '../components/game/DefenseView'
import JudgmentView from '../components/game/JudgmentView'
import OvertimeVoteView from '../components/game/OvertimeVoteView'
import ShowdownView from '../components/game/ShowdownView'
import GhostBanner from '../components/game/GhostBanner'
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
import DayChatPanel from '../components/game/DayChatPanel'
import NightChatPanel from '../components/game/NightChatPanel'
import WhisperPanel from '../components/game/WhisperPanel'
import HostDevPanel from '../components/devpanel/HostDevPanel'

export default function GameRoute() {
  const { uid } = useAuth()
  const { lobby, players } = useLobby()
  const { myRole } = useGameState()

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

      {!me?.alive && <GhostBanner />}

      <div className="game-shell__body">
        <div className="game-shell__main">
          {lobby.phase === 'briefing' && <BriefingView />}
          {lobby.phase === 'night' && <NightPhaseView />}
          {lobby.phase === 'night' && myRole?.faction === 'ci' && <NightChatPanel />}
          {lobby.phase === 'discussion' && <DiscussionView />}
          {lobby.phase === 'showdown' && <ShowdownView />}
          {lobby.phase === 'accusation' && <AccusationView />}
          {lobby.phase === 'defense' && <DefenseView />}
          {lobby.phase === 'judgment' && <JudgmentView />}
          {lobby.phase === 'overtime' && <OvertimeVoteView />}
          {(lobby.phase === 'accusation' ||
            lobby.phase === 'defense' ||
            lobby.phase === 'judgment' ||
            lobby.phase === 'overtime') && <TomeControl />}
          {lobby.phase === 'judgment' && <PuppeteerControl />}
          {lobby.phase !== 'night' && (
            <>
              <DayChatPanel />
              <WhisperPanel />
            </>
          )}
          {isDrBright && <HostDevPanel />}
        </div>

        <div className="game-shell__sidebar">
          <details className="card collapsible" open>
            <summary>Your role</summary>
            <SecretRoleCard />
          </details>
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
