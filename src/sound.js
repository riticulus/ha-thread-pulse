//# Optional sound for messages (issue #12).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- sound (issue #12) ----------
  // A short, quiet tick for every animated message: high for messages to Home Assistant, low for commands.
  // Generated with Web Audio (no files). Off by default; browsers only allow sound after the page was clicked/tapped.
  // Rate-limited: at least 150 ms between ticks, at most 5 per second.
  const SOUND_GAP_MS = 150,
    SOUND_MAX_PER_S = 5;
  let soundOn = false,
    soundVolume = 0.4,
    audioCtx = null,
    lastTick = 0,
    tickTimes = [];
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
    if (!soundOn || soundVolume <= 0) return;
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
    gain.gain.exponentialRampToValueAtTime(0.12 * soundVolume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }
  function setSound(on, save = true) {
    soundOn = on;
    $("soundbtn").textContent = on ? T.soundOff : T.soundOn;
    $("volume").hidden = !on;
    if (on) ensureAudio();
    if (save) prefs.set("sound", on);
  }
  root.addEventListener(
    "pointerdown",
    () => {
      if (soundOn) ensureAudio();
    },
    true,
  ); // unlock audio after a reload
