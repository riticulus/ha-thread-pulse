//# Trends per device: signal and battery over the last 7 days (issue #38).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- trends (issue #38) ----------
  // Battery: hourly mean from Home Assistant's long-term statistics – complete, also for times without an open page.
  // Signal: Thread Pulse's own samples (every load and refresh, i.e. every 5 minutes while a page is open), averaged per
  // hour – battery devices: signal to the parent; routers: best link to another router. Stored in Home Assistant per user
  // (like the change log, #86), so a wall tablet that is always open fills the history for every device; hours without
  // an open page are gaps in the line. Max. 7 days; written at most every 15 minutes (read-merge-write).
  const SIG_KEY = "thread_pulse_signal", TREND_H = 7 * 24, HOUR_MS = 3600000, SIG_SAVE_MS = 15 * 60000;
  let sigHist = {}, sigStore = null, sigDirty = false, sigLoading = null;   // id → [[hour, dBm, samples], …] oldest first
  let battHist = {};                                 // id → { t: loaded at, pts: [[hour, %], …] }
  let trendHover = null;                             // { key, i } – survives the panel refresh every 5 s
  const hourNow = () => Math.floor(Date.now() / HOUR_MS);
  function pruneSig(h = hourNow()) {
    for (const id of Object.keys(sigHist)) { sigHist[id] = sigHist[id].filter(e => e[0] > h - TREND_H); if (!sigHist[id].length) delete sigHist[id]; }
  }
  function mergeSig(a, b) {                          // per device and hour, keep the entry with more samples
    const out = {};
    for (const src of [a, b]) for (const [id, list] of Object.entries(src || {})) {
      const m = out[id] = out[id] || {};
      for (const e of list) if (Array.isArray(e) && e.length === 3 && (!m[e[0]] || m[e[0]][2] < e[2])) m[e[0]] = e;
    }
    for (const id of Object.keys(out)) out[id] = Object.values(out[id]).sort((x, y) => x[0] - y[0]);
    return out;
  }
  // compact form for storage: hours relative to a base hour
  const packSig = () => { const base = hourNow() - TREND_H;
    return { version: 1, base, d: Object.fromEntries(Object.entries(sigHist).map(([id, l]) => [id, l.map(([h, v, n]) => [h - base, v, n])])) }; };
  const unpackSig = v => !v || !v.d ? {} : Object.fromEntries(Object.entries(v.d).map(([id, l]) => [id, (l || []).map(([dh, x, n]) => [v.base + dh, x, n])]));
  function signalNow() {                             // the value per device right now (same as the panel and the list)
    const out = {};
    if (!listData) return out;
    const isRouterId = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || extraIds.has(id);
    for (const n of Object.values(nodeById)) {
      if (n.type === "routing_end_device") {
        const rl = (linksOf[n.id] || []).filter(l => l.kind === "neighbour" && isRouterId(l.id));
        if (rl.length) out[n.id] = Math.max(...rl.map(l => l.rssi));
      } else {
        const p = listData.parents.find(x => x.childId === n.id);
        if (p) out[n.id] = p.rssi;
      }
    }
    return out;
  }
  function recordSignal() {                          // after every render (load and refresh)
    if (DEMO) return;
    const h = hourNow();
    for (const [id, v] of Object.entries(signalNow())) {
      const l = sigHist[id] = sigHist[id] || [], last = l[l.length - 1];
      if (last && last[0] === h) { last[1] = Math.round((last[1] * last[2] + v) / (last[2] + 1) * 10) / 10; last[2]++; }
      else l.push([h, v, 1]);
    }
    pruneSig(h); sigDirty = true;
    if (!sigLoading) sigLoading = loadSignalStore();
  }
  async function loadSignalStore() {                 // once: what other pages and devices recorded
    const hass = freshHass(), conn = hass && hass.connection;
    try {
      if (!conn) throw new Error("no connection");
      const r = await conn.sendMessagePromise({ type: "frontend/get_user_data", key: SIG_KEY });
      sigHist = mergeSig(sigHist, unpackSig(r && r.value)); sigStore = conn;
    } catch (e) { sigHist = mergeSig(sigHist, unpackSig(prefs.get("signal"))); sigStore = null; }   // fallback: this browser
    pruneSig();
    if (panelNode && nodeById[panelNode]) renderPanel();
  }
  async function saveSignal() {
    if (DEMO || !sigDirty || destroyed) return;
    sigDirty = false;
    if (!sigStore) { prefs.set("signal", packSig()); return; }
    try {
      const r = await sigStore.sendMessagePromise({ type: "frontend/get_user_data", key: SIG_KEY });
      sigHist = mergeSig(sigHist, unpackSig(r && r.value)); pruneSig();
      await sigStore.sendMessagePromise({ type: "frontend/set_user_data", key: SIG_KEY, value: packSig() });
    } catch (e) { prefs.set("signal", packSig()); }
  }
  every(saveSignal, SIG_SAVE_MS);
  window.addEventListener("pagehide", () => { saveSignal(); });
  async function loadBatteryTrend(n) {               // hourly mean of the battery entity, on demand (panel opened)
    const c = battHist[n.id];
    if (c && (c.loading || Date.now() - c.t < 30 * 60000)) return;
    if (DEMO) {
      const b = battOf[n.id] !== undefined ? battOf[n.id] : n.demoBattery; if (b === undefined) return;
      const h = hourNow(), drop = b < 50 ? 0.03 : 0.006;
      battHist[n.id] = { t: Date.now(), pts: Array.from({ length: TREND_H }, (_, k) => [h - TREND_H + 1 + k, Math.min(100, Math.round((b + drop * (TREND_H - 1 - k)) * 10) / 10)]) };
      return;
    }
    const hass = freshHass(), ent = (n.entities || []).find(id => { const st = hass && hass.states[id];
      return st && st.attributes.device_class === "battery" && st.attributes.unit_of_measurement === "%"; });
    if (!ent) return;
    battHist[n.id] = { t: Date.now(), loading: true, pts: c ? c.pts : [] };
    try {
      const res = await hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date((hourNow() - TREND_H + 1) * HOUR_MS).toISOString(),
                                      statistic_ids: [ent], period: "hour", types: ["mean"] });
      const pts = (res[ent] || []).map(r => [Math.floor((typeof r.start === "number" ? r.start : Date.parse(r.start)) / HOUR_MS), Math.round(r.mean * 10) / 10]).filter(p => !isNaN(p[1]));
      battHist[n.id] = { t: Date.now(), pts };
    } catch (e) { battHist[n.id] = { t: Date.now(), pts: [] }; }
    if (panelNode === n.id) renderPanel();
  }
  // demo: an invented week with gaps (no page open at night)
  function demoSignal(n) {
    const now = signalNow()[n.id]; if (now === undefined) return [];
    const h = hourNow(), out = [];
    for (let k = TREND_H - 1; k >= 0; k--) {
      const hr = h - k, local = new Date(hr * HOUR_MS).getHours();
      if (local >= 1 && local < 7 && k > 2) continue;                         // nobody looked at night
      const wobble = Math.round(Math.sin((hr + n.id.length) / 5) * 3 + Math.sin(hr / 17) * 2);
      out.push([hr, k < 2 ? now : Math.max(-100, Math.min(-30, now + wobble + (k > 100 ? -4 : 0))), 12]);
    }
    return out;
  }
  // ---------- sparkline (SVG) ----------
  const trendPts = {};                               // chart key → points, for the hover readout
  function sparkline(key, pts, lo, hi, fmt, guide) {
    if (!pts.length) return "";
    const W = 300, H = 56, h0 = hourNow() - TREND_H + 1, x = hr => 4 + (hr - h0) / (TREND_H - 1) * (W - 8);   // 4 units margin: the newest point is not cut off
    const y = v => H - 4 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (H - 8);
    trendPts[key] = { pts, fmt, x, y };
    let d = "", dots = "";
    pts.forEach(([hr, v], i) => {                     // gap > 2 h: the line breaks; a point alone between gaps is a dot
      const joined = i > 0 && hr - pts[i - 1][0] <= 2, next = i < pts.length - 1 && pts[i + 1][0] - hr <= 2;
      const at = `${x(hr).toFixed(1)},${y(v).toFixed(1)}`;
      if (!joined && !next) dots += `M${at} l0.01,0 `; else d += `${joined ? "L" : "M"}${at} `;
    });
    const hv = trendHover && trendHover.key === key ? pts[trendHover.i] : null;
    const days = Array.from({ length: 7 }, (_, k) => { const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - k); return Math.floor(t.getTime() / HOUR_MS); })
      .filter(hr => hr > h0).map(hr => `<line x1="${x(hr).toFixed(1)}" x2="${x(hr).toFixed(1)}" y1="0" y2="${H}" class="tday"/>`).join("");
    return `<div class="trend"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-trend="${esc(key)}" role="img" aria-label="${esc(fmt(pts[pts.length - 1][1]))}">` + days +
      (guide !== undefined ? `<line x1="0" x2="${W}" y1="${y(guide).toFixed(1)}" y2="${y(guide).toFixed(1)}" class="tguide"/>` : "") +
      `<path d="${d}" class="tline"/><path d="${dots}" class="tline dots"/><circle r="3" class="tdot"${hv ? ` cx="${x(hv[0]).toFixed(1)}" cy="${y(hv[1]).toFixed(1)}"` : ' style="display:none"'}/></svg>` +
      `<div class="tread">${esc(readout(hv || pts[pts.length - 1], fmt))}</div></div>`;
  }
  const readout = (p, fmt) => new Date(p[0] * HOUR_MS).toLocaleString(lang, { weekday: "short", hour: "2-digit", minute: "2-digit" }) + " · " + fmt(p[1]);
  function signalTrendHtml(n) {
    const pts = DEMO ? demoSignal(n) : (sigHist[n.id] || []);
    if (!pts.length) return `<h4>${T.trendSignal(n.type === "routing_end_device")}</h4><div class="note">${T.trendNoSignal}</div>`;
    const vals = pts.map(p => p[1]), lo = Math.min(-90, ...vals) - 2, hi = Math.max(-50, ...vals) + 2;
    return `<h4>${T.trendSignal(n.type === "routing_end_device")}</h4>` + sparkline("s:" + n.id, pts, lo, hi, v => `${Math.round(v)} dBm · ${QUAL(v)[2]}`, -80) +
      `<div class="note">${T.trendSignalNote(pts.length, TREND_H)}</div>`;
  }
  function batteryTrendHtml(n) {
    loadBatteryTrend(n);
    const c = battHist[n.id]; if (!c || !c.pts.length) return "";
    return sparkline("b:" + n.id, c.pts, 0, 100, v => `${Math.round(v)} %`, 20) + `<div class="note">${T.trendBattNote}</div>`;
  }
  // hover / tap: nearest hour of the chart
  root.addEventListener("pointermove", e => trendPointer(e));
  root.addEventListener("pointerdown", e => trendPointer(e));
  function trendPointer(e) {
    const svg = e.target.closest && e.target.closest("svg[data-trend]"); if (!svg) return;
    const t = trendPts[svg.dataset.trend]; if (!t) return;
    const r = svg.getBoundingClientRect(), h0 = hourNow() - TREND_H + 1, hr = h0 + ((e.clientX - r.left) / r.width * 300 - 4) / 292 * (TREND_H - 1);
    let best = 0; t.pts.forEach((p, i) => { if (Math.abs(p[0] - hr) < Math.abs(t.pts[best][0] - hr)) best = i; });
    if (trendHover && trendHover.key === svg.dataset.trend && trendHover.i === best) return;
    trendHover = { key: svg.dataset.trend, i: best };
    const p = t.pts[best], dot = svg.querySelector(".tdot"), rd = svg.parentNode.querySelector(".tread");   // only the dot and the readout
    dot.setAttribute("cx", t.x(p[0]).toFixed(1)); dot.setAttribute("cy", t.y(p[1]).toFixed(1)); dot.style.display = "";
    rd.textContent = readout(p, t.fmt);
  }
