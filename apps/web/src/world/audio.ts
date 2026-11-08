/**
 * Sonido ambiente generado con Web Audio (sin archivos): un colchón suave con el acorde del mundo y
 * campanitas pentatónicas al azar. Solo arranca tras un gesto del usuario.
 */
export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private pad: { osc: OscillatorNode; gain: GainNode }[] = [];
  private filter: BiquadFilterNode | null = null;
  private chimeTimer: number | null = null;
  private chord: number[] = [];
  private muted = false;

  start(chord: number[]): void {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 900;
    this.filter.Q.value = 0.6;
    this.filter.connect(this.master);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain).connect(this.filter.frequency);
    lfo.start();

    this.setChord(chord);
    this.scheduleChime();
  }

  setChord(chord: number[]): void {
    const ctx = this.ctx;
    if (!ctx || !this.filter) {
      this.chord = chord;
      return;
    }
    this.chord = chord;
    const now = ctx.currentTime;
    for (const voice of this.pad) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.8);
      voice.osc.stop(now + 4);
    }
    this.pad = chord.flatMap((freq, i) =>
      [0, 1].map((detune) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune ? 6 : -6;
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(0.022 / (i + 1) ** 0.4, now + 0.2, 1.4);
        osc.connect(gain).connect(this.filter!);
        osc.start(now);
        return { osc, gain };
      }),
    );
  }

  /** Barrido suave al cruzar una puerta. */
  whoosh(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const length = 1.6;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(3200, now + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    src.connect(bp).connect(gain).connect(this.master);
    src.start(now);
    for (let i = 0; i < 4; i++) this.chime(now + 0.25 + i * 0.12, 1.4);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.2);
    }
  }

  dispose(): void {
    if (this.chimeTimer !== null) window.clearTimeout(this.chimeTimer);
    this.chimeTimer = null;
    void this.ctx?.close();
    this.ctx = null;
    this.pad = [];
  }

  private scheduleChime(): void {
    this.chimeTimer = window.setTimeout(
      () => {
        if (this.ctx) this.chime(this.ctx.currentTime, 0.6);
        this.scheduleChime();
      },
      1800 + Math.random() * 3500,
    );
  }

  private chime(at: number, volume: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.chord.length === 0) return;
    const pentatonic = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
    const root = this.chord[0]! * 4;
    const freq = root * pentatonic[Math.floor(Math.random() * pentatonic.length)]!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.03 * volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
    osc.connect(gain).connect(this.master);
    osc.start(at);
    osc.stop(at + 2.7);
  }
}
