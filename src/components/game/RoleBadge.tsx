import Icon from '../icons/Icon'
import { FACTION_ICONS, ROLE_ICONS } from '../../game/roleIcons'
import type { Faction, RoleId } from '../../game/types'

/** Role icon badge with a small faction icon overlapping the corner - the "class + orientation" image. */
export default function RoleBadge({ role, faction, size = 64 }: { role: RoleId; faction: Faction; size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        className={`icon-badge faction-${faction}`}
        style={{ width: size, height: size, padding: size * 0.22 }}
      >
        <Icon svg={ROLE_ICONS[role]} size={size * 0.56} />
      </div>
      <div
        className={`icon-badge faction-${faction}`}
        style={{
          position: 'absolute',
          bottom: -4,
          right: -4,
          width: size * 0.42,
          height: size * 0.42,
          padding: size * 0.09,
          background: 'var(--bg-panel)',
        }}
      >
        <Icon svg={FACTION_ICONS[faction]} size={size * 0.24} />
      </div>
    </div>
  )
}
