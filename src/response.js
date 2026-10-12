//# Response time per device (issue #2).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- response time per device (issue #2) ----------
  // Command (call_service) → first state report of the same entity (state_changed), both with Home Assistant's own
  // time stamps (time_fired), so the browser's connection does not distort the result. Matched by context id, or else
  // the first report within 10 s. Commands that change nothing (e.g. turn_on on a light that is on) get no report.
  const RESP_WINDOW = 10000, SLOW_MS = 1000, SLOW_MIN = 3;
  const pendingCmd = {}, respOf = {};
  const haTime = iso => {                              // HA sends microseconds; keep milliseconds (Safari cannot parse more)
    const m = String(iso || "").match(/^(.*T\d\d:\d\d:\d\d)(\.\d+)?(.*)$/);
    return m ? Date.parse(m[1] + (m[2] ? m[2].slice(0, 4) : "") + m[3]) : NaN;
  };
  const median = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : Math.round((b[m - 1] + b[m]) / 2); };
  function recordResponse(nodeId, ms) {
    const a = respOf[nodeId] = respOf[nodeId] || [];
    a.push({ ms: Math.round(ms), t: Date.now() }); if (a.length > 20) a.shift();
    if (panelNode === nodeId) renderPanel();
  }
  function respSummary(nodeId) {
    const a = respOf[nodeId]; if (!a || !a.length) return null;
    return { last: a[a.length - 1].ms, med: median(a.map(x => x.ms)), n: a.length };
  }
  function slowHint(n) {
    const r = respSummary(n.id);
    return r && r.n >= SLOW_MIN && r.med >= SLOW_MS ? T.hSlow(r.med, r.n) : null;
  }
  const controllable = n => (n.mainEntities || []).some(e => ["light", "switch", "cover", "lock", "fan", "climate", "valve", "media_player"].includes(e.split(".")[0]));
  // ---------- response time on the map (issue #89) ----------
  // Optional view (⋯ menu): a ring around every device with measured response times, coloured by the median –
  // green < 500 ms, orange < 1 s, red ≥ 1 s (the same 1 s as the "slow" hint) – with the value below it. Devices without
  // measurements stay unchanged (no grey: that means "not reachable"). Commands then travel at the measured speed.
  const RESP_MID = 500;
  let respView = prefs.get("resp");
  const respColor = ms => ms < RESP_MID ? COLORS.good : ms < SLOW_MS ? COLORS.medium : COLORS.weak;
  function setRespView(on, save = true) {
    respView = on;
    $("respbtn").textContent = on ? T.respViewOff : T.respViewOn;
    for (const el of root.querySelectorAll(".lgresp")) el.hidden = !on;
    if (save) prefs.set("resp", on);
    if (network) network.redraw();
  }
  function drawResponseRings(ctx) {
    if (!respView) return;
    const pos = network.getPositions();
    for (const n of [...Object.values(nodeById), ...Object.values(wifiById)]) {
      const r = respSummary(n.id), p = pos[n.id]; if (!r || !p) continue;
      const rad = (n.type === "routing_end_device" ? 20 : 14) + 6, c = respColor(r.med);
      ctx.save();
      if (searchActive && !searchHits.includes(n.id)) ctx.globalAlpha = 0.18;
      ctx.strokeStyle = c; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI); ctx.stroke();
      ctx.font = "600 10px -apple-system, Segoe UI, Roboto, sans-serif";
      const t = r.med >= 1000 ? (Math.round(r.med / 100) / 10).toLocaleString(lang) + " s" : r.med + " ms", w = ctx.measureText(t).width + 8;
      pill(ctx, p.x - w / 2, p.y - rad - 9, t, c);
      ctx.restore();
    }
  }
