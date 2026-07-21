import { getAudioContext } from "./audioContext";

const buffers = new Map<string, AudioBuffer>();
const activeLoops = new Map<string, AudioBufferSourceNode>();

async function load(sounds: Record<string, string>, onFileLoaded?: () => void) {
  const ctx = getAudioContext();
  await Promise.all(
    Object.entries(sounds).map(async ([name, path]) => {
      try {
        const arrayBuffer = await fetch(path).then((r) => r.arrayBuffer());
        buffers.set(name, await ctx.decodeAudioData(arrayBuffer));
      } catch (err) {
        console.warn(`Sfx: failed to load "${name}" from ${path}`, err);
      } finally {
        onFileLoaded?.();
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

function loop(name: string, options: { volume?: number } = {}) {
  if (activeLoops.has(name)) return; // already looping
  const buffer = buffers.get(name);
  if (!buffer) return;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = options.volume ?? 1;

  source.connect(gain).connect(ctx.destination);
  source.start();
  activeLoops.set(name, source);
}

function stopLoop(name: string) {
  const source = activeLoops.get(name);
  if (!source) return;
  source.stop();
  activeLoops.delete(name);
}

export const Sfx = { load, play, loop, stopLoop };
