export default function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return <button onClick={onToggle}>{enabled ? '🔊 Sound on' : '🔈 Sound off'}</button>
}
