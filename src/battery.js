// Battery forecast (issue #39).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

import { batteryStatistics, forecastFrom } from "./forecast.js";

export default function install(tp) {
  const { DEMO, esc, every, freshHass, renderPanel } = tp;
  Object.assign(tp, { batteryHint, forecastText, loadBatteryForecasts });
  // ---------- battery forecast (issue #39) ----------
  // Estimate when a battery will be empty, from Home Assistant's long-term statistics (daily mean of the battery
  // entity, kept permanently – the normal history is only kept for 10 days by default); the estimate is in forecast.js.
  const BF_SOON = 30;
  tp.battForecast = {};
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
    let series = {};
    try {
      series = await batteryStatistics(hass, ids);
    } catch (e) {
      console.warn("Thread Pulse: battery statistics", e);
      return;
    }
    for (const [nodeId, ent] of Object.entries(entOf))
      tp.battForecast[nodeId] = forecastFrom(series[ent], tp.battOf[nodeId]);
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
