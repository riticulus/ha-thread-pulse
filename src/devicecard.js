// Device card (issue #126): <thread-pulse-device-card> – one Thread device for a room dashboard, without the map.
// Shows reachability, role, parent with signal (routers: their links to other routers), battery with forecast and the
// signal of the last 7 days. Tapping it opens the Thread Pulse map with the device selected (option map_path), else
// the device page of Home Assistant.
// Data: the cached Matter diagnostics of all devices (to name the parent), the border router address, the signal
// history the map stores in Home Assistant, and the battery statistics. All device cards on a page share one load,
// refreshed at most every 5 minutes – like the map, nothing is queried from the devices themselves.
import { textFor } from "./i18n/index.js";
import { fetchDiagnostics, hex16, threadAddressOf, typeOfRole } from "./matter.js";
import { batteryStatistics, forecastFrom } from "./forecast.js";
import { SIG_KEY, TREND_H, hourNow, unpackSig } from "./signalstore.js";

const MESH_MS = 5 * 60000,
  BATT_MS = 6 * 3600000;
// shared by all device cards on the page: { t, promise } of the Matter devices with their Thread data / the signal history
const meshSlot = { v: null },
  sigSlot = { v: null };

async function loadMesh(hass) {
  const entries = await hass.callWS({ type: "config_entries/get", domain: "matter" });
  if (!entries.length) throw Object.assign(new Error("no matter"), { code: "noMatter" });
  const entry = entries[0].entry_id;
  const devReg = await hass.callWS({ type: "config/device_registry/list" });
  const devs = {},
    byExt = {};
  await Promise.all(
    devReg
      .filter(d => d.config_entries.includes(entry))
      .map(async d => {
        let node;
        try {
          node = await fetchDiagnostics(hass, entry, d.id);
        } catch (e) {
          if (e.status === 401 || e.status === 403) throw Object.assign(e, { code: "notAdmin" });
          return; // one device without diagnostics does not stop the others
        }
        const ext = threadAddressOf(node),
          a = node.attributes || {};
        devs[d.id] = {
          id: d.id,
          name: d.name_by_user || d.name,
          areaId: d.area_id,
          available: node.available,
          ext,
          type: ext ? typeOfRole(a["0/53/1"]) : null,
          role: a["0/53/1"],
          neigh: a["0/53/7"] || [],
        };
        if (ext) byExt[ext] = d.id;
      }),
  );
  let brExt = null;
  try {
    brExt = Object.values(await hass.callWS({ type: "otbr/info" }))[0].extended_address.toLowerCase();
  } catch (e) {} // no OpenThread add-on
  return { devs, byExt, brExt };
}
function cached(slot, ms, load) {
  if (!slot.v || Date.now() - slot.v.t > ms) {
    slot.v = { t: Date.now(), promise: load() };
    slot.v.promise.catch(() => (slot.v = null)); // try again next time
  }
  return slot.v.promise;
}
async function loadSignal(hass) {
  try {
    const r = await hass.connection.sendMessagePromise({ type: "frontend/get_user_data", key: SIG_KEY });
    return unpackSig(r && r.value);
  } catch (e) {
    return {};
  }
}

// the connection of one device, as the map computes it (graph.js): parent = the neighbour with the best signal, with
// the signal measured by the parent router if it reports the device as its child
function connectionOf(dev, mesh) {
  if (dev.type === "routing_end_device") {
    const links = dev.neigh.filter(x => !x["13"]); // children are not router links
    return { router: true, links: links.length, best: links.length ? Math.max(...links.map(x => x["6"])) : null };
  }
  const best = [...dev.neigh].sort((p, q) => q["6"] - p["6"])[0];
  if (!best) return { router: false, parent: null };
  const pid = hex16(best["0"]),
    pdev = mesh.devs[mesh.byExt[pid]];
  const fromRouter = pdev && pdev.neigh.find(x => x["13"] && hex16(x["0"]) === dev.ext);
  return { router: false, parent: pid, parentDev: pdev, rssi: fromRouter ? fromRouter["6"] : best["6"] };
}
const quality = rssi => (rssi >= -65 ? "good" : rssi >= -80 ? "medium" : "weak");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// signal of the last 7 days: one point per hour, gaps where no page was open
function sparkline(series) {
  const W = 300,
    H = 44,
    lo = -95,
    hi = -40,
    h0 = hourNow() - TREND_H + 1;
  const x = h => ((h - h0) / (TREND_H - 1)) * W,
    y = v => H - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * H;
  const segs = [];
  let cur = [];
  for (const [h, v] of series.filter(e => e[0] >= h0)) {
    if (cur.length && h - cur[cur.length - 1][0] > 1) segs.push(cur), (cur = []);
    cur.push([h, v]);
  }
  if (cur.length) segs.push(cur);
  // lines for runs of hours, a thick dot for an hour on its own (a short history has many of those)
  const lines = segs
    .filter(s => s.length > 1)
    .map(s => "M" + s.map(([h, v]) => `${x(h)},${y(v)}`).join("L"))
    .join(" ");
  const dots = segs
    .filter(s => s.length === 1)
    .map(s => `M${x(s[0][0])},${y(s[0][1])}h0.01`)
    .join(" ");
  return (
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">` +
    `<line class="guide" x1="0" x2="${W}" y1="${y(-80)}" y2="${y(-80)}"/><path class="line" d="${lines}"/>` +
    `<path class="dots" d="${dots}"/></svg>`
  );
}

// demo mode (no Home Assistant data needed): one battery device and one router
function demoData(kind) {
  const h = hourNow(),
    series = [];
  let v = kind === "router" ? -52 : -73;
  for (let k = TREND_H - 1; k >= 0; k--) {
    v = Math.max(-90, Math.min(-45, v + (Math.random() - 0.5) * 3));
    if (k % 50 < 8) continue; // hours without an open page
    series.push([h - k, Math.round(v), 12]);
  }
  return kind === "router"
    ? {
        name: "Kitchen plug",
        area: "Kitchen",
        available: true,
        type: "routing_end_device",
        role: 5,
        conn: { router: true, links: 6, best: -50 },
        series,
      }
    : {
        name: "Front door",
        area: "Office",
        available: true,
        type: "sleepy_end_device",
        role: 2,
        conn: { router: false, parentName: "Kitchen plug", rssi: -73 },
        battery: 15,
        forecast: { state: "ok", days: 22, perMonth: 20, basis: 60 },
        series,
      };
}

const STYLE = `
  :host { display: block; }
  ha-card { height: 100%; }
  button.tp { all: unset; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
              padding: 14px 16px; cursor: pointer; color: var(--primary-text-color); font-family: var(--ha-card-font-family, inherit); }
  button.tp:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; border-radius: var(--ha-card-border-radius, 12px); }
  .hd { display: flex; align-items: center; gap: 10px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--success-color, #43a047); }
  .dot.off { background: var(--error-color, #db4437); }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; }
  .sub { color: var(--secondary-text-color); font-size: 12px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; margin: 0; font-size: 14px; }
  dt { color: var(--secondary-text-color); }
  dd { margin: 0; overflow-wrap: anywhere; }
  .good { color: var(--success-color, #2e7d32); } .medium { color: var(--warning-color, #ef6c00); } .weak, .off-t { color: var(--error-color, #c62828); }
  .muted { color: var(--secondary-text-color); }
  svg { width: 100%; height: 44px; display: block; background: var(--secondary-background-color, rgba(127,127,127,.08)); border-radius: 6px; }
  svg .line { fill: none; stroke: var(--primary-color, #1e88e5); stroke-width: 1.8; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
  svg .dots { fill: none; stroke: var(--primary-color, #1e88e5); stroke-width: 5; vector-effect: non-scaling-stroke; stroke-linecap: round; }
  svg .guide { stroke: var(--error-color, #e53935); stroke-dasharray: 3 3; stroke-width: 1; vector-effect: non-scaling-stroke; opacity: .6; }
  .tl { color: var(--secondary-text-color); font-size: 11px; margin-top: 2px; }
  .msg { padding: 14px 16px; color: var(--secondary-text-color); }`;

class ThreadPulseDeviceCard extends HTMLElement {
  setConfig(config) {
    if (!config || (!config.device && !config.demo)) throw new Error("Choose a Thread device (option: device)");
    this._config = { ...config };
    this._battery = null;
    this._render();
    if (this._hass) this._refresh();
  }
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._refresh();
    else this._render(); // battery level and reachability come with every state change
  }
  connectedCallback() {
    this._timer = setInterval(() => this._refresh(), MESH_MS);
  }
  disconnectedCallback() {
    clearInterval(this._timer);
  }
  get _T() {
    const l = (this._config && this._config.language) || (this._hass && this._hass.language) || "en";
    return textFor(l.slice(0, 2));
  }
  _deviceId() {
    const d = this._config.device || "";
    if (d.includes(".") && this._hass && this._hass.entities && this._hass.entities[d])
      return this._hass.entities[d].device_id;
    return d;
  }
  async _refresh() {
    if (!this._hass || !this._config || this._config.demo) return this._render();
    try {
      this._mesh = await cached(meshSlot, MESH_MS, () => loadMesh(this._hass));
      this._sig = await cached(sigSlot, MESH_MS, () => loadSignal(this._hass));
      this._error = null;
      await this._loadBattery();
    } catch (e) {
      this._error = e.code || "error";
      console.warn("Thread Pulse device card:", e);
    }
    this._render();
  }
  _batteryEntity(devId) {
    const h = this._hass;
    for (const e of Object.values(h.entities || {})) {
      if (e.device_id !== devId) continue;
      const st = h.states[e.entity_id];
      if (st && st.attributes.device_class === "battery" && st.attributes.unit_of_measurement === "%") return st;
    }
    return null;
  }
  async _loadBattery() {
    // the forecast: daily statistics, loaded again after 6 hours
    const st = this._batteryEntity(this._deviceId());
    if (!st || (this._battery && this._battery.entity === st.entity_id && Date.now() - this._battery.t < BATT_MS))
      return;
    try {
      const series = await batteryStatistics(this._hass, [st.entity_id]);
      this._battery = { entity: st.entity_id, t: Date.now(), points: series[st.entity_id] };
    } catch (e) {
      this._battery = { entity: st.entity_id, t: Date.now(), points: [] };
    }
  }
  _data() {
    // what the card shows, from Home Assistant or the demo
    if (this._config.demo) {
      this._demo = this._demo || demoData(this._config.demo);
      return this._config.name ? { ...this._demo, name: this._config.name } : this._demo;
    }
    const devId = this._deviceId(),
      dev = this._mesh.devs[devId];
    if (!dev) return null;
    const h = this._hass,
      area = dev.areaId && h.areas && h.areas[dev.areaId] ? h.areas[dev.areaId].name : "";
    const out = {
      devId,
      name: this._config.name || dev.name,
      area,
      available: dev.available,
      type: dev.type,
      role: dev.role,
    };
    if (!dev.ext) return out;
    const c = connectionOf(dev, this._mesh);
    if (!c.router && c.parent)
      c.parentName = c.parentDev
        ? c.parentDev.name
        : c.parent === this._mesh.brExt
          ? this._T.brLabel
          : "…" + c.parent.slice(-4);
    out.conn = c;
    out.series = (this._sig && this._sig[dev.ext]) || [];
    const st = this._batteryEntity(devId);
    if (st) {
      out.battery = Math.round(parseFloat(st.state));
      if (this._battery && this._battery.entity === st.entity_id)
        out.forecast = forecastFrom(this._battery.points, out.battery);
    }
    return out;
  }
  _render() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    if (!this._config) return;
    const T = this._T;
    let body;
    if (this._error)
      body = `<div class="msg">${esc(this._error === "notAdmin" ? T.notAdmin : this._error === "noMatter" ? T.noMatter : T.error)}</div>`;
    else if (!this._config.demo && !this._mesh) body = `<div class="msg">${esc(T.loading)}</div>`;
    else {
      const d = this._data();
      if (!d) body = `<div class="msg">${esc(T.dcNotFound)}</div>`;
      else body = this._cardHtml(d, T);
    }
    root.innerHTML = `<style>${STYLE}</style><ha-card>${body}</ha-card>`;
    const b = root.querySelector("button.tp");
    if (b) b.onclick = () => this._open();
  }
  _cardHtml(d, T) {
    const role = T.roles[d.role] || T.types[d.type] || "";
    let h =
      `<div class="hd"><span class="dot${d.available ? "" : " off"}"></span><div><div class="name">${esc(d.name)}</div>` +
      `<div class="sub">${esc([role, d.area].filter(Boolean).join(" · "))}${d.available ? "" : ` · <span class="off-t">${esc(T.dcOffline)}</span>`}</div></div></div>`;
    if (!d.conn)
      return `<button class="tp" aria-label="${esc(T.dcOpen(d.name))}">${h}<div class="muted">${esc(T.dcNotThread)}</div></button>`;
    const sig = r => `<span class="${quality(r)}">${r} dBm · ${esc(T[quality(r)])}</span>`;
    h += `<dl>`;
    if (d.conn.router)
      h += `<dt>${esc(T.dcLinks)}</dt><dd>${d.conn.links ? `${esc(T.dcRouterLinks(d.conn.links))} · ${sig(d.conn.best)}` : `<span class="muted">${esc(T.dcNone)}</span>`}</dd>`;
    else
      h += `<dt>${esc(T.parent)}</dt><dd>${d.conn.parentName ? `${esc(d.conn.parentName)} · ${sig(d.conn.rssi)}` : `<span class="muted">${esc(T.dcNone)}</span>`}</dd>`;
    if (typeof d.battery === "number" && !isNaN(d.battery)) {
      const f = d.forecast,
        cls = d.battery < 20 ? "weak" : d.battery < 40 ? "medium" : "good";
      const ft = f && f.state === "ok" ? T.bfEmpty(f.days) : ""; // the longer notes (not enough data …) only on the map
      h += `<dt>${esc(T.secBattery)}</dt><dd><span class="${cls}">${d.battery} %</span>${ft ? ` <span class="muted">· ${esc(ft)}</span>` : ""}</dd>`;
    }
    h += `</dl>`;
    h += d.series.length
      ? `<div>${sparkline(d.series)}<div class="tl">${esc(d.conn.router ? T.dcTrendRouter : T.dcTrendParent)}</div></div>`
      : `<div class="tl">${esc(T.dcNoTrend)}</div>`;
    return `<button class="tp" aria-label="${esc(T.dcOpen(d.name))}">${h}</button>`;
  }
  _open() {
    const devId = this._config.demo ? null : this._deviceId(),
      map = (this._config.map_path || "").trim();
    let path;
    if (map) path = devId ? `${map}${map.includes("?") ? "&" : "?"}tp_device=${encodeURIComponent(devId)}` : map;
    else if (devId) path = `/config/devices/device/${devId}`;
    if (!path) return;
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }
  getCardSize() {
    return 3;
  }
  getGridOptions() {
    return { columns: 12, min_columns: 6 }; // full section width, height follows the content
  }
  static getStubConfig() {
    return { device: "" };
  }
  static getConfigForm() {
    return {
      schema: [
        { name: "device", required: true, selector: { device: { integration: "matter" } } },
        { name: "name", selector: { text: {} } },
        { name: "map_path", selector: { text: {} } },
        {
          name: "language",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "", label: "Home Assistant language" },
                { value: "en", label: "English" },
                { value: "de", label: "Deutsch" },
                { value: "fr", label: "Français" },
                { value: "it", label: "Italiano" },
                { value: "es", label: "Español" },
                { value: "nl", label: "Nederlands" },
              ],
            },
          },
        },
      ],
      computeLabel: s =>
        ({
          device: "Thread device",
          name: "Name (empty = the device name)",
          map_path:
            "Tap opens the map at (path of the view with the Thread Pulse card, e.g. /dashboard-network/thread; empty = device page)",
          language: "Language",
        })[s.name],
    };
  }
}
if (!customElements.get("thread-pulse-device-card"))
  customElements.define("thread-pulse-device-card", ThreadPulseDeviceCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "thread-pulse-device-card"))
  window.customCards.push({
    type: "thread-pulse-device-card",
    name: "Thread Pulse – device",
    preview: false,
    description: "One Thread device: parent and signal, battery with forecast, signal of the last 7 days.",
    documentationURL: "https://github.com/riticulus/ha-thread-pulse/wiki/Device-Card",
  });
