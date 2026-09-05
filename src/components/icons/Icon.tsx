import type { CSSProperties } from 'react'

/** Renders a pre-fetched, build-time-bundled SVG string (see game/roleIcons.ts) inline so it
 * picks up `currentColor` from CSS. Never pass runtime/user-supplied content here. */
export default function Icon({
  svg,
  size = 24,
  className,
  style,
}: {
  svg: string
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
