// Signal history as stored in Home Assistant per user (issue #38) – written by the map, read by the device card.
// Per device (Thread address) and hour: [hour, mean dBm, samples]; hours are counted from 1970 (ms / HOUR_MS).
export const SIG_KEY = "thread_pulse_signal",
  TREND_H = 7 * 24,
  HOUR_MS = 3600000;
export const hourNow = () => Math.floor(Date.now() / HOUR_MS);
// stored form: hours relative to a base hour → { id: [[hour, dBm, samples], …] }
export const unpackSig = v =>
  !v || !v.d
    ? {}
    : Object.fromEntries(
        Object.entries(v.d).map(([id, l]) => [id, (l || []).map(([dh, x, n]) => [v.base + dh, x, n])]),
      );
