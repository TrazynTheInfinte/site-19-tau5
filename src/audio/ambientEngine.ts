import type { GamePhase } from '../firebase/schema'

interface PhasePreset {
  /** Fundamental drone pitch, Hz */
  baseFreq: number
  /** Detune between the three layered oscillators, in cents - wider = more dissonant/tense */
  detune: number
  /** Lowpass filter cutoff, Hz - lower = darker/muffled */
  filterCutoff: number
  /** Overall drone level, 0-1 */
  gain: number
  /** Filtered noise texture level, 0-1 */
  noiseGain: number
  /** Slow amplitude-wobble rate, Hz */
  lfoRate: number
  /** Wobble depth as a fraction of `gain` */
  lfoDepth: number
}

const PRESETS: Record<GamePhase, PhasePreset> = {
  lobby: { baseFreq: 110, detune: 6, filterCutoff: 900, gain: 0.1, noiseGain: 0.008, lfoRate: 0.08, lfoDepth: 0.15 },
  briefing: { baseFreq: 118, detune: 5, filterCutoff: 1000, gain: 0.08, noiseGain: 0.005, lfoRate: 0.07, lfoDepth: 0.12 },
  night: { baseFreq: 82, detune: 16, filterCutoff: 380, gain: 0.14, noiseGain: 0.05, lfoRate: 0.05, lfoDepth: 0.3 },
  day: { baseFreq: 130, detune: 4, filterCutoff: 1400, gain: 0.07, noiseGain: 0, lfoRate: 0.12, lfoDepth: 0.1 },
  overtime: { baseFreq: 98, detune: 22, filterCutoff: 520, gain: 0.16, noiseGain: 0.07, lfoRate: 0.45, lfoDepth: 0.4 },
  ended: { baseFreq: 110, detune: 6, filterCutoff: 900, gain: 0, noiseGain: 0, lfoRate: 0.08, lfoDepth: 0 },
}

const TRANSITION_SECONDS = 3
const OSCILLATOR_DETUNE_SPREAD = [-1, 0, 1] // multiplied by preset.detune, in cents

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 2
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/**
 * A small procedural ambient soundscape - three detuned oscillators through a lowpass filter,
 * a filtered-noise texture layer, and a slow LFO-driven wobble, all re-targetable per game
 * phase via smooth AudioParam ramps (no clicks/pops on phase change). Built with raw Web
 * Audio API instead of licensed tracks: no external files, no hosting, no licensing questions.
 */
export class AmbientEngine {
  private ctx: AudioContext | null = null
  private oscillators: OscillatorNode[] = []
  private droneGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private noiseGain: GainNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoDepthGain: GainNode | null = null
  private userGain: GainNode | null = null

  get isRunning(): boolean {
    return this.ctx !== null
  }

  /** Must be called synchronously from a user-gesture event handler (autoplay policy). */
  start(initialPhase: GamePhase): void {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx

    const userGain = ctx.createGain()
    userGain.gain.value = 1
    userGain.connect(ctx.destination)
    this.userGain = userGain

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = PRESETS[initialPhase].filterCutoff
    filter.connect(userGain)
    this.filter = filter

    const droneGain = ctx.createGain()
    droneGain.gain.value = PRESETS[initialPhase].gain
    droneGain.connect(filter)
    this.droneGain = droneGain

    this.oscillators = OSCILLATOR_DETUNE_SPREAD.map((spread) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = PRESETS[initialPhase].baseFreq
      osc.detune.value = spread * PRESETS[initialPhase].detune
      osc.connect(droneGain)
      osc.start()
      return osc
    })

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = makeNoiseBuffer(ctx)
    noiseSource.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 500
    noiseFilter.Q.value = 0.7
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = PRESETS[initialPhase].noiseGain
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(userGain)
    noiseSource.start()
    this.noiseGain = noiseGain

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = PRESETS[initialPhase].lfoRate
    const lfoDepthGain = ctx.createGain()
    lfoDepthGain.gain.value = PRESETS[initialPhase].gain * PRESETS[initialPhase].lfoDepth
    lfo.connect(lfoDepthGain)
    lfoDepthGain.connect(droneGain.gain)
    lfo.start()
    this.lfo = lfo
    this.lfoDepthGain = lfoDepthGain
  }

  setPhase(phase: GamePhase): void {
    if (!this.ctx || !this.droneGain || !this.filter || !this.noiseGain || !this.lfo || !this.lfoDepthGain) return
    const preset = PRESETS[phase]
    const t = this.ctx.currentTime + TRANSITION_SECONDS

    this.oscillators.forEach((osc, i) => {
      osc.frequency.linearRampToValueAtTime(preset.baseFreq, t)
      osc.detune.linearRampToValueAtTime(OSCILLATOR_DETUNE_SPREAD[i] * preset.detune, t)
    })
    this.filter.frequency.linearRampToValueAtTime(preset.filterCutoff, t)
    this.droneGain.gain.linearRampToValueAtTime(preset.gain, t)
    this.noiseGain.gain.linearRampToValueAtTime(preset.noiseGain, t)
    this.lfo.frequency.linearRampToValueAtTime(preset.lfoRate, t)
    this.lfoDepthGain.gain.linearRampToValueAtTime(preset.gain * preset.lfoDepth, t)
  }

  setMuted(muted: boolean): void {
    if (!this.ctx || !this.userGain) return
    const t = this.ctx.currentTime + 0.4
    this.userGain.gain.linearRampToValueAtTime(muted ? 0 : 1, t)
  }

  stop(): void {
    this.oscillators.forEach((osc) => osc.stop())
    this.lfo?.stop()
    void this.ctx?.close()
    this.ctx = null
    this.oscillators = []
    this.droneGain = null
    this.filter = null
    this.noiseGain = null
    this.lfo = null
    this.lfoDepthGain = null
    this.userGain = null
  }
}
