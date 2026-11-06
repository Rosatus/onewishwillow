const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`

export class WillowAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private ambientAudio: HTMLAudioElement | null = null
  private snapAudio: HTMLAudioElement | null = null
  private enabled = false

  private ensure() {
    if (this.context) return this.context
    this.context = new window.AudioContext()
    this.master = this.context.createGain()
    this.master.gain.value = 0.7
    this.master.connect(this.context.destination)
    return this.context
  }

  async setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      this.ambientAudio?.pause()
      if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08)
      return
    }

    const context = this.ensure()
    await context.resume()
    if (this.master) this.master.gain.setTargetAtTime(0.7, context.currentTime, 0.12)
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio(assetUrl('audio/one_wish_willow.mp3'))
      this.ambientAudio.loop = true
      this.ambientAudio.preload = 'auto'
    }
    this.ambientAudio.volume = 0.42
    try {
      await this.ambientAudio.play()
    } catch {
      // A later user gesture will call setEnabled again if autoplay was blocked.
    }
  }

  snap() {
    if (!this.enabled) return
    const context = this.ensure()
    const now = context.currentTime
    if (!this.snapAudio) {
      this.snapAudio = new Audio(assetUrl('audio/branch-snap.mp3'))
      this.snapAudio.preload = 'auto'
    }
    this.snapAudio.currentTime = 0
    this.snapAudio.volume = 1
    void this.snapAudio.play().catch(() => undefined)
    if (this.ambientAudio) this.ambientAudio.volume = 0.14

    // Keep only a restrained low-frequency impact beneath the original branch recording.
    const sub = context.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(78, now)
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.55)
    const subGain = context.createGain()
    subGain.gain.setValueAtTime(0.32, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    sub.connect(subGain).connect(this.master!)
    sub.start(now)
    sub.stop(now + 0.65)
    window.setTimeout(() => {
      if (this.enabled && this.ambientAudio) this.ambientAudio.volume = 0.28
    }, 1700)
  }

  chime() {
    if (!this.enabled) return
    const context = this.ensure()
    const now = context.currentTime
    ;[196, 293.66, 392].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      const gain = context.createGain()
      const start = now + index * 0.34
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.075, start + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 2.8)
      oscillator.connect(gain).connect(this.master!)
      oscillator.start(start)
      oscillator.stop(start + 3)
    })
  }

  dispose() {
    this.ambientAudio?.pause()
    this.snapAudio?.pause()
    void this.context?.close()
    this.context = null
  }
}
