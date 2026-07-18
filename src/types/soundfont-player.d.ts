declare module "soundfont-player" {
  interface PlayOptions {
    gain?: number;
    duration?: number;
  }

  export interface PlayingNode {
    stop(when?: number): void;
  }

  export interface Player {
    play(note: number | string, when?: number, options?: PlayOptions): PlayingNode;
    stop(): void;
  }

  interface InstrumentOptions {
    soundfont?: "MusyngKite" | "FluidR3_GM";
    from?: string;
  }

  const Soundfont: {
    instrument(
      ac: AudioContext,
      name: string,
      options?: InstrumentOptions,
    ): Promise<Player>;
  };

  export default Soundfont;
}
