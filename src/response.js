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
