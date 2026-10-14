// Optional sound for messages (issue #12).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { $, prefs, root } = tp;
  Object.assign(tp, { playTick, setSound });
  // ---------- sound (issue #12) ----------
  // A short, quiet tick for every animated message: high for messages to Home Assistant, low for commands.
  // Generated with Web Audio (no files). Off by default; browsers only allow sound after the page was clicked/tapped.
  // Rate-limited: at least 150 ms between ticks, at most 5 per second.
  const SOUND_GAP_MS = 150,
    SOUND_MAX_PER_S = 5;
  tp.soundOn = false;
  tp.soundVolume = 0.4;
  let audioCtx = null;
  let lastTick = 0;
  let tickTimes = [];
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function playTick(down) {
    if (!tp.soundOn || tp.soundVolume <= 0) return;
    const now = performance.now();
    tickTimes = tickTimes.filter(t => now - t < 1000);
    if (now - lastTick < SOUND_GAP_MS || tickTimes.length >= SOUND_MAX_PER_S) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== "running") return;
    lastTick = now;
    tickTimes.push(now);
    const t = ctx.currentTime,
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(down ? 440 : 880, t);
    osc.frequency.exponentialRampToValueAtTime(down ? 330 : 1100, t + 0.05);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12 * tp.soundVolume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }
  function setSound(on, save = true) {
    tp.soundOn = on;
    $("soundbtn").textContent = on ? tp.T.soundOff : tp.T.soundOn;
    $("volume").hidden = !on;
    if (on) ensureAudio();
    if (save) prefs.set("sound", on);
  }
  root.addEventListener(
    "pointerdown",
    () => {
      if (tp.soundOn) ensureAudio();
    },
    true,
  ); // unlock audio after a reload
}
