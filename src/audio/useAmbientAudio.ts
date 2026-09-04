import { useEffect, useRef, useState } from 'react'
import { AmbientEngine } from './ambientEngine'
import type { GamePhase } from '../firebase/schema'

/**
 * Owns one AmbientEngine for the component's lifetime. Starting it requires a direct
 * user-gesture click (browser autoplay policy) - `toggle` must be called straight from a
 * button's onClick, not from an effect - so there's no auto-resume from a remembered
 * preference across page loads; every session starts muted until the player opts in.
 */
export function useAmbientAudio(phase: GamePhase | null) {
  const engineRef = useRef<AmbientEngine | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    engineRef.current = new AmbientEngine()
    return () => {
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (phase && engineRef.current?.isRunning) {
      engineRef.current.setPhase(phase)
    }
  }, [phase])

  function toggle() {
    const engine = engineRef.current
    if (!engine) return
    if (!engine.isRunning) {
      engine.start(phase ?? 'lobby')
      setEnabled(true)
      return
    }
    const next = !enabled
    engine.setMuted(!next)
    setEnabled(next)
  }

  return { enabled, toggle }
}
