const DUCK_LEVEL = 0.15
const DUCK_FADE_SECONDS = 0.35
const LOOP_FADE_SECONDS = 0.6

function fadeTo(audio: HTMLAudioElement, target: number, seconds: number): void {
  const start = audio.volume
  const startTime = performance.now()
  function step() {
    const elapsed = (performance.now() - startTime) / 1000
    const t = Math.min(1, elapsed / seconds)
    audio.volume = start + (target - start) * t
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function fadeOutAndPause(audio: HTMLAudioElement, seconds: number): void {
  fadeTo(audio, 0, seconds)
  setTimeout(() => audio.pause(), seconds * 1000 + 50)
}

/**
 * Plays licensed mp3 tracks via plain HTMLAudioElements: one persistent looping "ambient"
 * track per phase category, plus one-shot event stings that duck the loop's volume while they
 * play and restore it afterward. Deliberately not Web Audio API buffers/GainNodes - <audio>'s
 * own .volume is enough for fades this simple, and it streams large files instead of decoding
 * them fully into memory first.
 */
export class MusicManager {
  private loopAudio: HTMLAudioElement | null = null
  private loopBaseVolume = 0.5
  private muted = true
  private duckCount = 0

  /** Must be called at least once from a direct user-gesture handler (browser autoplay policy) -
   * every play() attempted before that point fails silently and simply never starts. */
  setEnabled(enabled: boolean): void {
    this.muted = !enabled
    const loop = this.loopAudio
    if (!loop) return
    if (this.muted) {
      loop.pause()
    } else {
      loop.volume = this.duckCount > 0 ? DUCK_LEVEL * this.loopBaseVolume : this.loopBaseVolume
      void loop.play().catch(() => {})
    }
  }

  /** Swaps the looping ambient track, fading the old one out and the new one in. Pass null to
   * fade out to silence (used for the 'ended' phase, where only a win sting should be heard). */
  crossfadeLoop(url: string | null): void {
    const old = this.loopAudio
    if (old) fadeOutAndPause(old, LOOP_FADE_SECONDS)

    if (!url) {
      this.loopAudio = null
      return
    }
    const audio = new Audio(url)
    audio.loop = true
    audio.volume = 0
    this.loopAudio = audio
    if (!this.muted) {
      void audio.play().catch(() => {})
      fadeTo(audio, this.duckCount > 0 ? DUCK_LEVEL * this.loopBaseVolume : this.loopBaseVolume, LOOP_FADE_SECONDS)
    }
  }

  /** One-shot event cue (vote result, execution, role reveal, win). No-ops entirely while muted. */
  playOneShot(url: string): void {
    if (this.muted) return
    this.duckCount++
    if (this.loopAudio) fadeTo(this.loopAudio, DUCK_LEVEL * this.loopBaseVolume, DUCK_FADE_SECONDS)

    const sting = new Audio(url)
    const releaseDuck = () => {
      this.duckCount = Math.max(0, this.duckCount - 1)
      if (this.duckCount === 0 && this.loopAudio) fadeTo(this.loopAudio, this.loopBaseVolume, DUCK_FADE_SECONDS)
    }
    sting.addEventListener('ended', releaseDuck)
    void sting.play().catch(releaseDuck)
  }

  destroy(): void {
    this.loopAudio?.pause()
    this.loopAudio = null
  }
}
