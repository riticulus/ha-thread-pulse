//# Stability counters over a time window, stored in Home Assistant (issue #24).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- stability over a time window (issue #24) ----------
  // The devices report restarts (lifetime), attach attempts and drop-offs (both since the device's last restart). Taken as
  // totals, a hint about them never goes away. Thread Pulse therefore keeps a history of the counter values (a sample only
  // when a value changes) and judges the INCREASE within the last N days (card option hint_window_days, default 7).
  // A counter that went down (device restarted, attach/drop-off counters reset) counts its new value as increase.
  // Until one day of history exists, the old behaviour (totals) applies, with a note that the trend is not known yet.
  // Stored in Home Assistant per user like the change log (#86), read-merge-write at most every 15 minutes; dismissed
  // hints ("Done") are stored there too and stay hidden until their counter increases again.
  const STAB_KEY = "thread_pulse_counters", STAB_KEEP_DAYS = 31, DAY_MS = 86400000, STAB_SAVE_MS = 15 * 60000;
  const HINT_DAYS = Math.max(1, Math.min(30, Math.round(Number(opts.hintDays) || 7)));
  let stabHist = {}, stabDismissed = {}, stabStore = null, stabDirty = false, stabLoading = null;   // id → [[t, reboots, attach, detached], …]
  const counterVals = n => { const i = n.info || {}; return [i.reboots, i.attach, i.detached].map(v => (typeof v === "number" ? v : null)); };
  function pruneStab(now = Date.now()) {
    const cut = now - STAB_KEEP_DAYS * DAY_MS;
    for (const id of Object.keys(stabHist)) {
      const l = stabHist[id], keepFrom = Math.max(0, l.findIndex(s => s[0] > cut) - 1);        // keep one sample before the cut as baseline
      stabHist[id] = l.findIndex(s => s[0] > cut) < 0 ? l.slice(-1) : l.slice(keepFrom);
    }
  }
  function mergeStab(a, b) {
    const out = {};
    for (const src of [a, b]) for (const [id, l] of Object.entries(src || {})) out[id] = (out[id] || []).concat((l || []).filter(s => Array.isArray(s) && s.length === 4));
    for (const id of Object.keys(out)) {
      const l = out[id].sort((x, y) => x[0] - y[0]), dedup = [];
      for (const s of l) { const p = dedup[dedup.length - 1]; if (!p || p[1] !== s[1] || p[2] !== s[2] || p[3] !== s[3]) dedup.push(s); }
      out[id] = dedup;
    }
    return out;
  }
  function mergeDismissed(a, b) {                    // id → { kind: time }; the later dismissal wins
    const out = JSON.parse(JSON.stringify(a || {}));
    for (const [id, kinds] of Object.entries(b || {})) for (const [k, t] of Object.entries(kinds || {})) {
      out[id] = out[id] || {};
      if (t === null) delete out[id][k]; else if (!out[id][k] || out[id][k] < t) out[id][k] = t;
    }
    return out;
  }
  function recordCounters() {                        // after every render (load and refresh)
    if (DEMO) return;
    const now = Date.now();
    for (const n of Object.values(nodeById)) {
      const v = counterVals(n); if (v.every(x => x === null)) continue;
      const l = stabHist[n.id] = stabHist[n.id] || [], last = l[l.length - 1];
      if (!last || last[1] !== v[0] || last[2] !== v[1] || last[3] !== v[2]) { l.push([now, ...v]); stabDirty = true; }
    }
    pruneStab(now);
    if (!stabLoading) stabLoading = loadStabStore();
  }
  async function loadStabStore() {
    const hass = freshHass(), conn = hass && hass.connection;
    try {
      if (!conn) throw new Error("no connection");
      const r = await conn.sendMessagePromise({ type: "frontend/get_user_data", key: STAB_KEY });
      const v = (r && r.value) || {};
      stabHist = mergeStab(stabHist, v.h); stabDismissed = mergeDismissed(stabDismissed, v.dismissed); stabStore = conn;
    } catch (e) {
      const v = prefs.get("counters") || {};
      stabHist = mergeStab(stabHist, v.h); stabDismissed = mergeDismissed(stabDismissed, v.dismissed); stabStore = null;
    }
    pruneStab(); renderList(); if (panelNode) renderPanel(); if (network) network.redraw();
  }
  async function saveStab(force = false) {
    if (DEMO || destroyed || (!stabDirty && !force)) return;
    stabDirty = false;
    const value = () => ({ version: 1, h: stabHist, dismissed: stabDismissed });
    if (!stabStore) { prefs.set("counters", value()); return; }
    try {
      const r = await stabStore.sendMessagePromise({ type: "frontend/get_user_data", key: STAB_KEY });
      const v = (r && r.value) || {};
      stabHist = mergeStab(stabHist, v.h); stabDismissed = mergeDismissed(v.dismissed, stabDismissed); pruneStab();
      await stabStore.sendMessagePromise({ type: "frontend/set_user_data", key: STAB_KEY, value: value() });
    } catch (e) { prefs.set("counters", value()); }
  }
  every(saveStab, STAB_SAVE_MS);
  window.addEventListener("pagehide", () => { saveStab(); });

  // increase of the counters since a point in time; samples plus the current value of the device
  function counterIncrease(n, since) {
    const now = counterVals(n), l = (DEMO ? n.demoCounters : stabHist[n.id]) || [];
    const pts = l.concat([[Date.now(), ...now]]);
    let bi = -1; pts.forEach((s, k) => { if (s[0] <= since) bi = k; });
    const start = Math.max(0, bi), covered = Date.now() - pts[0][0];
    const inc = [0, 0, 0];
    for (let k = start + 1; k < pts.length; k++) for (let f = 0; f < 3; f++) {
      const a = pts[k - 1][f + 1], b = pts[k][f + 1];
      if (a === null || b === null) continue;
      inc[f] += b > a ? b - a : b < a ? (f === 0 ? 0 : b) : 0;   // restarts never reset; attach/drop-offs restart from 0
    }
    return { reboots: inc[0], attach: inc[1], detached: inc[2], coveredMs: covered };
  }
  // stability of a device as used by warnings, hints and the mesh health
  //   known: at least one day of history → values are increases within the window (or the shorter covered time)
  function stabilityOf(n) {
    const i = n.info || {}, w = counterIncrease(n, Date.now() - HINT_DAYS * DAY_MS);
    if (w.coveredMs < DAY_MS) return { known: false, days: HINT_DAYS, reboots: i.reboots, attach: i.attach, detached: i.detached };
    return { known: true, days: Math.min(HINT_DAYS, Math.max(1, Math.floor(w.coveredMs / DAY_MS))), reboots: w.reboots, attach: w.attach, detached: w.detached };
  }
  // thresholds: within the window 5 attach attempts / 3 drop-offs (as before since restart), 3 restarts of a router
  // (before: 50 in the whole lifetime); with unknown trend the old totals apply
  function unstableOf(n) { const s = stabilityOf(n); return s.attach >= 5 || s.detached >= 3; }
  function powerCutOf(n) { const s = stabilityOf(n); return n.type === "routing_end_device" && (s.known ? s.reboots >= 3 : s.reboots >= 50); }
  // "Done": hidden until the counter of that kind increases again
  const DISMISS_KINDS = { power: f => f.reboots, unstable: f => f.attach + f.detached };
  function isDismissed(n, kind) {
    const t = (stabDismissed[n.id] || {})[kind]; if (!t) return false;
    return DISMISS_KINDS[kind](counterIncrease(n, t)) === 0;
  }
  function setDismissed(id, kind, on) {
    stabDismissed[id] = stabDismissed[id] || {};
    if (on) stabDismissed[id][kind] = Date.now(); else stabDismissed[id][kind] = null;
    saveStab(true).then(() => { if (stabDismissed[id] && stabDismissed[id][kind] === null) delete stabDismissed[id][kind]; });
    renderList(); if (panelNode) renderPanel(); if (network) network.redraw();
  }
