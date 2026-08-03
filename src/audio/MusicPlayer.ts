import { getAudioContext, unlockAudioContext } from "./audioContext";

export class MusicPlayer {
  private path: string;
  private volume: number;
  private startOffsetSeconds: number;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private starting = false;
  private ready = false;
  private paused = false;

  constructor(path: string, volume = 0.4, startOffsetSeconds = 0) {
    this.path = path;
    this.volume = volume;
    this.startOffsetSeconds = startOffsetSeconds;
  }

  async start() {
    if (this.ready || this.starting) return;
    this.starting = true;

    const ctx = getAudioContext();
    unlockAudioContext();
    const arrayBuffer = await fetch(this.path).then((r) => r.arrayBuffer());
    const buffer = await ctx.decodeAudioData(arrayBuffer);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = this.paused ? 0 : this.volume;

    source.connect(gain).connect(ctx.destination);
    // Offset only applies to this first play-through — once the buffer loops
    // it wraps back to the start, same as the old MIDI player's behavior.
    const offset = Math.max(0, Math.min(this.startOffsetSeconds, buffer.duration - 0.01));
    source.start(0, offset);

    this.source = source;
    this.gain = gain;
    this.starting = false;
    this.ready = true;
  }

  stop() {
    this.source?.stop();
    this.source = null;
    this.gain = null;
    this.ready = false;
  }

  // Mutes rather than truly pausing — AudioBufferSourceNode can't be paused
  // in place, and a silent-but-running loop is indistinguishable to the
  // player while being far simpler than tracking/restoring playback offset.
  pause() {
    if (!this.gain || this.paused) return;
    this.gain.gain.value = 0;
    this.paused = true;
  }

  resume() {
    if (!this.gain || !this.paused) return;
    this.gain.gain.value = this.volume;
    this.paused = false;
  }

  get isPaused(): boolean {
    return this.paused;
  }
}
