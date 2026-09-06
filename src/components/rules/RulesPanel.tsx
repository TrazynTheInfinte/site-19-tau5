import { useState } from 'react'
import { ALL_ROLE_IDS, ROLE_DEFINITIONS, type Faction, type RoleId } from '../../game/types'
import { ROLE_DESCRIPTIONS } from '../../game/roleDescriptions'
import { ROLE_ICONS } from '../../game/roleIcons'
import { SUB_ALIGNMENTS, SUB_ALIGNMENT_BLURB, SUB_ALIGNMENT_NAMES } from '../../game/subAlignments'
import Icon from '../icons/Icon'

const FACTION_ORDER: Faction[] = ['foundation', 'ci', 'serpentsHand']
const FACTION_LABEL: Record<Faction, string> = {
  foundation: 'Foundation',
  ci: 'Chaos Insurgency',
  serpentsHand: "Serpent's Hand",
}

function GenericRules() {
  return (
    <div style={{ fontSize: '0.9rem' }}>
      <p>
        <strong className="faction-foundation">Foundation</strong> is the majority faction: they win once every{' '}
        <strong className="faction-ci">Chaos Insurgency</strong> member is eliminated. Chaos Insurgency is the
        minority evil faction: they win once their living count exceeds Foundation's.{' '}
        <strong className="faction-serpentsHand">Serpent's Hand</strong> is neutral - each of its roles has its own
        personal win condition instead of a shared one.
      </p>
      <p>
        Each cycle runs Night (secret role actions) &rarr; Discussion (60s, talk only, skippable once everyone's
        ready) &rarr; Voting (60s, cast your elimination vote) &rarr; back to Night. If the cycle cap is reached with
        no winner, the game skips straight to Overtime: a forced, no-abstain, sudden-death vote.
      </p>
      <p>
        The instant anyone is eliminated - by vote, night kill, or forfeit - their role, faction, and will become
        visible to everyone. Eliminated players become ghosts: they can't act or vote, but may send one anonymous
        tip to living players per remaining cycle.
      </p>
      <p>
        Public chat and private whispers are available any time except during the night. Chaos Insurgency shares one
        Tome: only its current holder can kill each night, and it passes automatically to a teammate if the holder
        dies, or by their own choice at any time during voting.
      </p>
      <p className="faint">
        Rare special case: if it ever comes down to just the Enforcer and the last living Chaos Insurgency member,
        the two duel it out with a revolver instead of a normal cycle.
      </p>
    </div>
  )
}

function RoleDetail({ role, onBack }: { role: RoleId; onBack: () => void }) {
  const def = ROLE_DEFINITIONS[role]
  const subCode = SUB_ALIGNMENTS[role]
  return (
    <div style={{ marginTop: 'var(--space-2)' }}>
      <button onClick={onBack} style={{ marginBottom: 'var(--space-3)' }}>
        &larr; Back to roles
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Icon svg={ROLE_ICONS[role]} size={28} />
        <h3 className={`faction-${def.faction}`} style={{ margin: 0 }}>
          {def.name}
        </h3>
      </div>
      <p className="faint" style={{ margin: '0.3rem 0' }}>
        {FACTION_LABEL[def.faction]} &middot; {SUB_ALIGNMENT_NAMES[subCode]} ({subCode})
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {SUB_ALIGNMENT_BLURB[subCode]}
      </p>
      <p style={{ marginTop: 'var(--space-3)' }}>{ROLE_DESCRIPTIONS[role]}</p>
    </div>
  )
}

export default function RulesPanel({ onClose }: { onClose: () => void }) {
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null)

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
        style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ marginBottom: 0 }}>Rules</h2>
          <button onClick={onClose}>Close</button>
        </div>

        {selectedRole ? (
          <RoleDetail role={selectedRole} onBack={() => setSelectedRole(null)} />
        ) : (
          <>
            <GenericRules />
            <h3 style={{ marginTop: 'var(--space-3)' }}>Roles</h3>
            {FACTION_ORDER.map((faction) => (
              <div key={faction} style={{ marginBottom: 'var(--space-3)' }}>
                <div
                  className={`faction-${faction}`}
                  style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}
                >
                  {FACTION_LABEL[faction]}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {ALL_ROLE_IDS.filter((r) => ROLE_DEFINITIONS[r].faction === faction).map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Icon svg={ROLE_ICONS[role]} size={16} />
                      {ROLE_DEFINITIONS[role].name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
