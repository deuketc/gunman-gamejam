import MidiPlayer from "midi-player-js";
import Soundfont from "soundfont-player";
import type { Player, PlayingNode } from "soundfont-player";

// General MIDI program numbers (0-127) mapped to soundfont-player's instrument
// names (see node_modules/soundfont-player/instruments.json for valid names).
const GM_INSTRUMENTS = [
  "acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano", "honkytonk_piano",
  "electric_piano_1", "electric_piano_2", "harpsichord", "clavinet",
  "celesta", "glockenspiel", "music_box", "vibraphone",
  "marimba", "xylophone", "tubular_bells", "dulcimer",
  "drawbar_organ", "percussive_organ", "rock_organ", "church_organ",
  "reed_organ", "accordion", "harmonica", "tango_accordion",
  "acoustic_guitar_nylon", "acoustic_guitar_steel", "electric_guitar_jazz", "electric_guitar_clean",
  "electric_guitar_muted", "overdriven_guitar", "distortion_guitar", "guitar_harmonics",
  "acoustic_bass", "electric_bass_finger", "electric_bass_pick", "fretless_bass",
  "slap_bass_1", "slap_bass_2", "synth_bass_1", "synth_bass_2",
  "violin", "viola", "cello", "contrabass",
  "tremolo_strings", "pizzicato_strings", "orchestral_harp", "timpani",
  "string_ensemble_1", "string_ensemble_2", "synth_strings_1", "synth_strings_2",
  "choir_aahs", "voice_oohs", "synth_choir", "orchestra_hit",
  "trumpet", "trombone", "tuba", "muted_trumpet",
  "french_horn", "brass_section", "synth_brass_1", "synth_brass_2",
  "soprano_sax", "alto_sax", "tenor_sax", "baritone_sax",
  "oboe", "english_horn", "bassoon", "clarinet",
  "piccolo", "flute", "recorder", "pan_flute",
  "blown_bottle", "shakuhachi", "whistle", "ocarina",
  "lead_1_square", "lead_2_sawtooth", "lead_3_calliope", "lead_4_chiff",
  "lead_5_charang", "lead_6_voice", "lead_7_fifths", "lead_8_bass__lead",
  "pad_1_new_age", "pad_2_warm", "pad_3_polysynth", "pad_4_choir",
  "pad_5_bowed", "pad_6_metallic", "pad_7_halo", "pad_8_sweep",
  "fx_1_rain", "fx_2_soundtrack", "fx_3_crystal", "fx_4_atmosphere",
  "fx_5_brightness", "fx_6_goblins", "fx_7_echoes", "fx_8_scifi",
  "sitar", "banjo", "shamisen", "koto",
  "kalimba", "bagpipe", "fiddle", "shanai",
  "tinkle_bell", "agogo", "steel_drums", "woodblock",
  "taiko_drum", "melodic_tom", "synth_drum", "reverse_cymbal",
  "guitar_fret_noise", "breath_noise", "seashore", "bird_tweet",
  "telephone_ring", "helicopter", "applause", "gunshot",
] as const;

const PERCUSSION_CHANNEL = 9; // MIDI channel 10 (0-indexed) is always the drum kit, no Program Change needed

export class MusicPlayer {
  private path: string;
  private volume: number;
  private startOffsetSeconds: number;
  private ctx: AudioContext | null = null;
  private player: MidiPlayer.Player | null = null;
  private instrumentsByProgram = new Map<number, Player>();
  private percussion: Player | null = null;
  private programByChannel = new Map<number, number>();
  private activeNotes = new Map<string, PlayingNode>();
  private starting = false;
  private ready = false;

  constructor(path: string, volume = 0.4, startOffsetSeconds = 0) {
    this.path = path;
    this.volume = volume;
    this.startOffsetSeconds = startOffsetSeconds;
  }

  // Browsers only allow audio to actually produce sound once the page has
  // seen a user gesture — this fires immediately if that's already true, and
  // silently resumes as soon as the player's first keypress/click arrives
  // otherwise, so nothing has to explicitly wait on that gesture to start.
  private unlockAudio() {
    const ctx = this.ctx!;
    if (ctx.state === "running") return;
    ctx.resume().catch(() => {});
    const resume = () => {
      ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
  }

  async start() {
    if (this.ready || this.starting) return;
    this.starting = true;

    this.ctx = new AudioContext();
    this.unlockAudio();
    const buffer = await fetch(this.path).then((r) => r.arrayBuffer());

    const player = new MidiPlayer.Player((event: MidiPlayer.Event) =>
      this.handleEvent(event),
    );
    player.loadArrayBuffer(buffer);
    this.player = player;

    const skipTo = Math.max(0, Math.min(this.startOffsetSeconds, player.getSongTime() - 0.01));
    if (skipTo > 0) player.skipToSeconds(skipTo);

    // The bundled type defs claim getEvents() returns a flat Event[], but at
    // runtime it's actually grouped per-track: Event[][].
    const tracks = player.getEvents() as unknown as MidiPlayer.Event[][];
    const usesPercussion = tracks.some((track) =>
      track.some((e) => e.channel === PERCUSSION_CHANNEL),
    );

    await Promise.all([
      ...player.instruments.map((program) =>
        Soundfont.instrument(this.ctx!, GM_INSTRUMENTS[program] ?? "acoustic_grand_piano").then(
          (instrument) => this.instrumentsByProgram.set(program, instrument),
        ),
      ),
      usesPercussion
        ? Soundfont.instrument(this.ctx!, "percussion").then((instrument) => {
            this.percussion = instrument;
          })
        : Promise.resolve(),
    ]);

    player.on("endOfFile", () => player.play());
    player.play();

    this.starting = false;
    this.ready = true;
  }

  stop() {
    this.player?.stop();
    this.player = null;
    this.ready = false;
  }

  private handleEvent(event: MidiPlayer.Event) {
    const channel = event.channel ?? 0;

    if (event.name === "Program Change" && event.value !== undefined) {
      this.programByChannel.set(channel, event.value);
      return;
    }

    if (event.noteNumber === undefined) return;
    const key = `${channel}:${event.noteNumber}`;

    if (event.name === "Note on" && event.velocity) {
      const instrument =
        channel === PERCUSSION_CHANNEL
          ? this.percussion
          : this.instrumentsByProgram.get(this.programByChannel.get(channel) ?? 0);
      if (!instrument) return;
      const node = instrument.play(event.noteNumber, undefined, {
        gain: (event.velocity / 127) * this.volume,
      });
      this.activeNotes.set(key, node);
      return;
    }

    if (event.name === "Note off" || event.name === "Note on") {
      this.activeNotes.get(key)?.stop();
      this.activeNotes.delete(key);
    }
  }
}
