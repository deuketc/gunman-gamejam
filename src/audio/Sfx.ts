import { getAudioContext } from "./audioContext";

const buffers = new Map<string, AudioBuffer>();

async function load(sounds: Record<string, string>) {
  const ctx = getAudioContext();
  await Promise.all(
    Object.entries(sounds).map(async ([name, path]) => {
      try {
        const arrayBuffer = await fetch(path).then((r) => r.arrayBuffer());
        buffers.set(name, await ctx.decodeAudioData(arrayBuffer));
      } catch (err) {
        console.warn(`Sfx: failed to load "${name}" from ${path}`, err);
      }
    }),
  );
}

function play(
  name: string,
  options: { volume?: number; playbackRate?: number } = {},
) {
  const buffer = buffers.get(name);
  if (!buffer) return;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = options.playbackRate ?? 1;

  const gain = ctx.createGain();
  gain.gain.value = options.volume ?? 1;

  source.connect(gain).connect(ctx.destination);
  source.start();
}

export const Sfx = { load, play };
