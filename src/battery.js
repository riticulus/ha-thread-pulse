// Battery forecast (issue #39).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { DEMO, esc, every, freshHass, renderPanel } = tp;
  Object.assign(tp, { batteryHint, forecastText, loadBatteryForecasts });
  // ---------- battery forecast (issue #39) ----------
  // Estimate when a battery will be empty, from Home Assistant's long-term statistics (daily mean of the battery
  // entity, kept permanently – the normal history is only kept for 10 days by default). Linear trend over up to
  // 120 days, only since the last battery change (a jump upwards). Shown only with at least 14 days of data and a
  // measurable drop. It is an estimate: many batteries stay almost full for a long time and then drop quickly.
  const BF_DAYS = 120,
    BF_MIN_DAYS = 14,
    BF_SOON = 30,
    BF_MAX = 3 * 365;
  tp.battForecast = {};
  function forecastFrom(points, current) {
    // points: [{ t: ms, v: % }] oldest first
    let p = points.filter(x => typeof x.v === "number" && !isNaN(x.v));
    for (let i = p.length - 1; i > 0; i--)
      if (p[i].v - p[i - 1].v >= 10) {
        p = p.slice(i);
        break;
      } // battery changed
    if (!p.length) return { state: "nodata", days: 0 };
    const span = (p[p.length - 1].t - p[0].t) / 86400000;
    if (span < BF_MIN_DAYS || p.length < 5) return { state: "nodata", days: Math.max(1, Math.round(span) + 1) };
    const t0 = p[0].t,
      xs = p.map(x => (x.t - t0) / 86400000),
      ys = p.map(x => x.v);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
      my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0),
      sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const slope = sxx ? sxy / sxx : 0; // % per day
    const drop = ys[0] - ys[ys.length - 1];
    const basis = Math.round(span);
    if (slope > -0.02 || drop < 2) return { state: "nodrop", basis };
    const now = typeof current === "number" ? current : ys[ys.length - 1];
    const days = now / -slope;
    return {
      state: "ok",
      days: days > BF_MAX ? Infinity : Math.max(1, Math.round(days)),
      perMonth: Math.round(-slope * 30 * 10) / 10,
      basis,
    };
  }
  async function loadBatteryForecasts(hass) {
    tp.battForecast = {};
    if (DEMO) {
      // invented daily series that end at the demo battery level
      for (const n of Object.values(tp.nodeById))
        if (n.demoBattery !== undefined) {
          const rate = 1 / 1.5,
            pts = [];
          for (let i = 60; i >= 0; i--)
            pts.push({ t: Date.now() - i * 86400000, v: Math.min(100, n.demoBattery + rate * i) });
          tp.battForecast[n.id] = forecastFrom(
            n.demoBattery === 100 ? pts.map(x => ({ t: x.t, v: 100 })) : pts,
            n.demoBattery,
          );
        }
      return;
    }
    const entOf = {};
    for (const n of Object.values(tp.nodeById))
      for (const id of n.entities || []) {
        const st = hass.states[id];
        if (st && st.attributes.device_class === "battery" && st.attributes.unit_of_measurement === "%") {
          entOf[n.id] = id;
          break;
        }
      }
    const ids = Object.values(entOf);
    if (!ids.length) return;
    let res = {};
    try {
      res = await hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(Date.now() - BF_DAYS * 86400000).toISOString(),
        statistic_ids: ids,
        period: "day",
        types: ["mean"],
      });
    } catch (e) {
      console.warn("Thread Pulse: battery statistics", e);
      return;
    }
    for (const [nodeId, ent] of Object.entries(entOf)) {
      const rows = res[ent] || [];
      const pts = rows.map(r => ({ t: typeof r.start === "number" ? r.start : Date.parse(r.start), v: r.mean }));
      tp.battForecast[nodeId] = forecastFrom(pts, tp.battOf[nodeId]);
    }
    if (tp.panelNode && tp.battForecast[tp.panelNode]) renderPanel();
    if (tp.network) tp.network.redraw();
  }
  every(() => {
    if (!DEMO) {
      const h = freshHass();
      if (h) loadBatteryForecasts(h);
    }
  }, 6 * 3600000);
  function forecastText(f) {
    if (!f) return "";
    if (f.state === "nodata") return tp.T.bfNoData(f.days);
    if (f.state === "nodrop") return tp.T.bfNoDrop(f.basis);
    return `${tp.T.bfEmpty(f.days)} <span style="color:var(--muted)">· ${esc(tp.T.bfBasis(f.basis, f.perMonth.toLocaleString(tp.lang)))}</span>`;
  }
  function batteryHint(n) {
    const f = tp.battForecast[n.id];
    return f && f.state === "ok" && f.days <= BF_SOON ? tp.T.hBattSoon(f.days) : null;
  }
}
