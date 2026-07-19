let ctx: AudioContext | null = null;
let unlocking = false;

export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

// Browsers only let an AudioContext actually produce sound once the page has
// seen a user gesture. This resumes immediately if that's already true, and
// silently resumes on the player's first keypress/click otherwise — nothing
// has to explicitly wait on that gesture before starting playback.
export function unlockAudioContext() {
  const audioCtx = getAudioContext();
  if (audioCtx.state === "running" || unlocking) return;
  unlocking = true;

  const resume = () => {
    audioCtx.resume().catch(() => {});
  };
  resume();
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });
}
