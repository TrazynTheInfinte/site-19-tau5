export default function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ position: 'fixed', top: '0.75rem', right: '0.75rem', zIndex: 10 }}>
      {enabled ? '🔊 Sound on' : '🔈 Sound off'}
    </button>
  )
}
