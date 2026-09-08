import SecretRoleCard from './SecretRoleCard'

export default function YourRolePanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-3)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '480px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ marginBottom: 0 }}>Your role</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <SecretRoleCard />
        </div>
      </div>
    </div>
  )
}
