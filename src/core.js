// Thread Pulse – shared core used by the standalone page (thread-pulse.html) and the dashboard card (dist/ha-thread-pulse.js).
// MIT License. https://github.com/riticulus/ha-thread-pulse
// This file is assembled into both outputs by build.py – edit it here, then run `python3 build.py`.

const VERSION = "1.2.0+dev";   // set to the release number when releasing, "<release>+dev" in between

const TP_CSS = `
  :root, :host { --bg: #ffffff; --fg: #1f2733; --muted: #6b7684; --card: #f6f8fb; --line: #d6dde6; }
  @media (prefers-color-scheme: dark) { :root, :host { --bg: #111418; --fg: #e3e7ec; --muted: #9aa4b1; --card: #1c2128; --line: #2e3540; } }
  #wrap { display: flex; flex-direction: column; height: 100%; background: var(--bg); color: var(--fg);
          font: 14px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif; }
  #bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--line); }
  #bar button { border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 8px; padding: 4px 10px; cursor: pointer; font: inherit; }
  #legend { display: contents; }
  #legend.hidden .lg { display: none; }
  #status { color: var(--muted); font-size: 12px; }
  #searchbox { display: inline-flex; align-items: center; gap: 6px; }
  #search { width: 200px; max-width: 60vw; border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 8px; padding: 4px 8px; font: inherit; }
  #search:focus { outline: 2px solid #1e88e5; outline-offset: -1px; }
  #hits { color: var(--muted); font-size: 12px; }
  .lg { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .ln { width: 18px; height: 3px; display: inline-block; border-radius: 2px; }
  .heatln { height: 7px; opacity: .6; filter: blur(.6px); }
  #stage { flex: 1; min-height: 300px; position: relative; container-type: size; }
  #net { position: absolute; inset: 0; }
  #live { position: absolute; left: 8px; bottom: 8px; max-width: calc(100% - 16px); font-size: 12px; color: var(--muted);
          background: color-mix(in srgb, var(--bg) 85%, transparent); border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; pointer-events: none; }
  #live:empty { display: none; }
  #live div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #live b { color: var(--fg); font-weight: 600; }
  #info { padding: 8px 12px 14px; border-top: 1px solid var(--line); font-size: 13px; max-height: 45%; overflow: auto; }
  #info.hidden { display: none; }
  table { border-collapse: collapse; width: 100%; }
  td, th { text-align: left; padding: 3px 6px; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 600; }
  .g { color: #2e7d32; } .o { color: #ef6c00; } .r { color: #c62828; }
  #err { color: #c62828; padding: 12px; white-space: pre-wrap; }
  #panel { position: absolute; top: 8px; right: 8px; bottom: 8px; width: 340px; max-width: calc(100% - 16px); overflow: auto; z-index: 5;
           background: var(--bg); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,.25); padding: 12px 14px; font-size: 13px; }
  #panel[hidden] { display: none; }
  @container (max-width: 600px) { #panel { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-width: none; max-height: 62%; border-radius: 14px 14px 0 0; } }
  #panel .hd { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
  #panel .hd img { width: 40px; height: 40px; flex: none; }
  #panel .hd .t { font-size: 16px; font-weight: 600; line-height: 1.2; }
  #panel .hd .s { color: var(--muted); font-size: 12px; }
  #panel .x { margin-left: auto; align-self: flex-start; border: 0; background: none; color: var(--muted); font-size: 22px; line-height: 1; cursor: pointer; padding: 0 2px; }
  #panel h4 { margin: 12px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-weight: 600; }
  #panel dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; }
  #panel dt { color: var(--muted); } #panel dd { margin: 0; overflow-wrap: anywhere; }
  #panel .warn { background: color-mix(in srgb, #fb8c00 18%, transparent); border: 1px solid #fb8c00; border-radius: 8px; padding: 6px 8px; margin: 6px 0; }
  #panel .hint { background: color-mix(in srgb, #1e88e5 14%, transparent); border: 1px solid #1e88e5; border-radius: 8px; padding: 6px 8px; margin: 6px 0; }
  #info a { color: inherit; }
  #panel .note { color: var(--muted); font-size: 11px; margin-top: 2px; }
  #panel .btn { display: inline-block; margin-top: 12px; border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 8px; padding: 5px 10px; cursor: pointer; font: inherit; }
`;
const TP_HTML = `
<div id="wrap">
  <div id="bar">
    <button id="reload"></button>
    <button id="toggle"></button>
    <button id="livebtn"></button>
    <button id="heatbtn"></button>
    <button id="roombtn"></button>
    <button id="legbtn"></button>
    <span id="searchbox"><input id="search" type="search" autocomplete="off" spellcheck="false"><span id="hits"></span></span>
    <span id="legend"></span>
    <span id="status"></span>
  </div>
  <div id="stage"><div id="net"></div><div id="live"></div><div id="panel" hidden></div></div>
  <div id="info" class="hidden"></div>
</div>
`;
// ---------- texts ----------
const TEXT = {
  en: {
    reload: "↻ Reload", showList: "☰ Show list", hideList: "☰ Hide list", pause: "⏸ Pause live", resume: "▶ Resume live",
    roomsOn: "⌂ Rooms", roomsOff: "⌂ Rooms off", noArea: "No area",
    searchPh: "🔍 Find device or room", hits: n => n === 0 ? "no match" : `${n} found`,
    showLegend: "ⓘ Legend", hideLegend: "ⓘ Hide legend", heatOn: "≋ Traffic", heatOff: "≋ Traffic off", lgHeat: "Traffic (10 min)",
    heatTitle: n => `${n} message${n === 1 ? "" : "s"} in the last 10 min`, forwarded: "Forwarded for others", forwardedVal: (m, h) => `${m} last 10 min · ${h} last hour`,
    lgBr: "Border router", lgRouter: "Router (forwards)", lgEnd: "Mains end device", lgSleepy: "Battery device",
    good: "good", medium: "medium", weak: "weak", lgUp: "Message → HA", lgDown: "Command HA →",
    loading: "loading …", asOf: (t, n) => `as of ${t} · ${n} devices`, error: "Error",
    types: { routing_end_device: "Router", end_device: "End device (mains)", sleepy_end_device: "Battery device" },
    unreachable: " – NOT REACHABLE", brLabel: "Border router", brTitle: "Thread border router (OpenThread Border Router add-on)",
    foreignLabel: id => `Other Thread router\n…${id.slice(-4)}`,
    foreignTitle: "Thread router that is not a Matter device of Home Assistant (e.g. Apple TV / HomePod, Google Nest, another border router)",
    parentsHead: "Battery devices and their parent", parentsSub: "(the router they talk through – weakest first)",
    thDevice: "Device", thVia: "talks through", thSignal: "Signal", selfMeasured: "(own measurement, unreliable)",
    weakHead: "Weak links between routers", weakSub: "(below −80 dBm)",
    foot: n => `${n} Thread devices · Lines: signal strength (RSSI). Dashed = battery device ↔ parent. Data from the Matter diagnostics, as last reported by the devices. Animated paths are the most likely route according to the routing tables, not a radio capture.`,
    perMin: n => `${n} messages in the last minute`, state: "state",
    states: { on: "on", off: "off", open: "open", closed: "closed" },
    noHa: "No connection to Home Assistant. Open this page inside a Home Assistant dashboard (iframe card), or add ?demo to the address to see a demo.",
    notAdmin: "Home Assistant refused the request. Thread Pulse needs a user with administrator rights.",
    noMatter: "The Matter integration is not set up in this Home Assistant.",
    noDevices: "No Matter devices on Thread were found.",
    demo: "DEMO",
    tapHint: "Tap a device for details",
    secDevice: "Device", secThread: "Thread", secStability: "Stability", secBattery: "Battery", secValues: "Current values", secLive: "Live (since this page was opened)",
    manufacturer: "Manufacturer", model: "Model", firmware: "Firmware", hardware: "Hardware", area: "Area", role: "Role",
    roles: { 2: "Sleepy end device", 3: "End device", 4: "End device (can become router)", 5: "Router", 6: "Router (leader)" },
    parent: "Parent", children: "Children", neighbours: "Neighbours", address: "Address",
    reboots: "Restarts (total)", bootReason: "Last restart", detached: "Dropped off the network", attach: "Attach attempts", parentChanges: "Parent changes",
    sinceRestart: "Counters since the device's last restart. Restarts also count power cuts (e.g. a bulb on a wall switch).",
    bootReasons: ["unknown", "power on", "brown-out", "software watchdog", "hardware watchdog", "firmware update", "software reset"],
    level: "Level", type: "Type",
    msgsTotal: "Messages", msgsMin: "Last minute", msgsHour: "Last hour", lastMsg: "Last message", toHa: "to HA", fromHa: "from HA", none: "none yet",
    ago: s => s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`,
    openDevice: "Open device in Home Assistant",
    warnAttach: n => `${n} attach attempts since restart – the connection is unstable`,
    warnDetached: n => `Dropped off the network ${n} times since restart`,
    warnBattery: p => `Battery low (${p} %)`,
    stale: "Thread data as last reported by the device, may be outdated.",
    secHints: "Hints", hintsHead: "Hints for the network", listHints: n => ` · ${n} hint${n === 1 ? "" : "s"}`,
    hintsNote: "Hints are rules of thumb based on the data the devices report – suggestions, not measurements.",
    noHints: "No weak spots found.",
    hWeakParent: (p, r, unsure) => `Weak signal to its parent ${p} (${r} dBm${unsure ? ", measured by the device itself – uncertain" : ""}). A mains-powered Thread device (plug or bulb) placed closer to this device could improve the connection.`,
    hUnstable: "Possible causes of the unstable connection: weak signal to the parent, the parent lost power, radio interference (e.g. Wi-Fi or other 2.4 GHz devices nearby) or a weak battery.",
    hPowerCut: (n, kids) => `Restarted ${n} times in total – it probably loses power from time to time (e.g. a bulb on a wall switch, or a plug that gets unplugged). While it is off, it cannot forward messages${kids.length ? `; ${kids.join(", ")} then ${kids.length === 1 ? "has" : "have"} to find a new parent` : ""}. Tip: leave it powered and switch it via Home Assistant.`,
    hEdge: r => `Only weak links to other routers (best: ${r} dBm) – it sits at the edge of the mesh. Another router in between would strengthen it.`,
  },
  de: {
    reload: "↻ Neu laden", showList: "☰ Liste anzeigen", hideList: "☰ Liste ausblenden", pause: "⏸ Live pausieren", resume: "▶ Live starten",
    roomsOn: "⌂ Räume", roomsOff: "⌂ Räume aus", noArea: "Ohne Bereich",
    searchPh: "🔍 Gerät oder Raum suchen", hits: n => n === 0 ? "kein Treffer" : `${n} gefunden`,
    showLegend: "ⓘ Legende", hideLegend: "ⓘ Legende ausblenden", heatOn: "≋ Verkehr", heatOff: "≋ Verkehr aus", lgHeat: "Verkehr (10 min)",
    heatTitle: n => `${n} Nachricht${n === 1 ? "" : "en"} in den letzten 10 min`, forwarded: "Für andere weitergeleitet", forwardedVal: (m, h) => `${m} letzte 10 min · ${h} letzte Stunde`,
    lgBr: "Border Router", lgRouter: "Router (leitet weiter)", lgEnd: "Endgerät am Strom", lgSleepy: "Batteriegerät",
    good: "gut", medium: "mittel", weak: "schwach", lgUp: "Meldung → HA", lgDown: "Befehl HA →",
    loading: "lade …", asOf: (t, n) => `Stand ${t} · ${n} Geräte`, error: "Fehler",
    types: { routing_end_device: "Router", end_device: "Endgerät (Strom)", sleepy_end_device: "Batteriegerät" },
    unreachable: " – NICHT ERREICHBAR", brLabel: "Border Router", brTitle: "Thread Border Router (Add-on OpenThread Border Router)",
    foreignLabel: id => `Fremder Thread-Router\n…${id.slice(-4)}`,
    foreignTitle: "Thread-Router, der kein Matter-Gerät von Home Assistant ist (z. B. Apple TV / HomePod, Google Nest, anderer Border Router)",
    parentsHead: "Batteriegeräte und ihr «Parent»", parentsSub: "(Gerät, über das sie funken – schwächste zuerst)",
    thDevice: "Gerät", thVia: "funkt über", thSignal: "Signal", selfMeasured: "(Gerätemessung, unsicher)",
    weakHead: "Schwache Verbindungen zwischen Routern", weakSub: "(unter −80 dBm)",
    foot: n => `${n} Thread-Geräte · Linien: Signalstärke (RSSI). Gestrichelt = Batteriegerät ↔ Parent. Daten aus den Matter-Diagnosen, Stand der letzten Meldung der Geräte. Animierte Wege sind der wahrscheinlichste Weg laut Routing-Tabellen, keine Funkaufzeichnung.`,
    perMin: n => `${n} Nachrichten in der letzten Minute`, state: "Zustand",
    states: { on: "an", off: "aus", open: "offen", closed: "zu" },
    noHa: "Keine Verbindung zu Home Assistant. Die Seite muss in einem Home-Assistant-Dashboard (Iframe-Karte) geöffnet werden – oder ?demo an die Adresse anhängen für eine Demo.",
    notAdmin: "Home Assistant hat die Anfrage abgelehnt. Thread Pulse braucht einen Benutzer mit Administratorrechten.",
    noMatter: "Die Matter-Integration ist in diesem Home Assistant nicht eingerichtet.",
    noDevices: "Keine Matter-Geräte im Thread-Netz gefunden.",
    demo: "DEMO",
    tapHint: "Gerät antippen für Details",
    secDevice: "Gerät", secThread: "Thread", secStability: "Stabilität", secBattery: "Batterie", secValues: "Aktuelle Werte", secLive: "Live (seit Seitenaufruf)",
    manufacturer: "Hersteller", model: "Modell", firmware: "Firmware", hardware: "Hardware", area: "Bereich", role: "Rolle",
    roles: { 2: "Batteriegerät (schläft)", 3: "Endgerät", 4: "Endgerät (kann Router werden)", 5: "Router", 6: "Router (Leader)" },
    parent: "Parent", children: "Kinder", neighbours: "Nachbarn", address: "Adresse",
    reboots: "Neustarts (gesamt)", bootReason: "Letzter Neustart", detached: "Netz verloren", attach: "Verbindungsversuche", parentChanges: "Parent-Wechsel",
    sinceRestart: "Zähler seit dem letzten Neustart des Geräts. Neustarts zählen auch Stromunterbrüche (z. B. Lampe am Wandschalter).",
    bootReasons: ["unbekannt", "Einschalten", "Unterspannung", "Software-Watchdog", "Hardware-Watchdog", "Firmware-Update", "Software-Neustart"],
    level: "Ladestand", type: "Typ",
    msgsTotal: "Nachrichten", msgsMin: "Letzte Minute", msgsHour: "Letzte Stunde", lastMsg: "Letzte Nachricht", toHa: "an HA", fromHa: "von HA", none: "noch keine",
    ago: s => s < 60 ? `vor ${s} s` : s < 3600 ? `vor ${Math.round(s / 60)} min` : s < 86400 ? `vor ${Math.round(s / 3600)} h` : `vor ${Math.round(s / 86400)} d`,
    openDevice: "Gerät in Home Assistant öffnen",
    warnAttach: n => `${n} Verbindungsversuche seit Neustart – Verbindung instabil`,
    warnDetached: n => `${n}× Netz verloren seit Neustart`,
    warnBattery: p => `Batterie schwach (${p} %)`,
    stale: "Thread-Daten: letzter Stand, den das Gerät gemeldet hat – kann veraltet sein.",
    secHints: "Hinweise", hintsHead: "Hinweise zum Netz", listHints: n => ` · ${n} Hinweis${n === 1 ? "" : "e"}`,
    hintsNote: "Hinweise sind Faustregeln aus den Daten, die die Geräte melden – Vorschläge, keine Messungen.",
    noHints: "Keine Schwachstellen gefunden.",
    hWeakParent: (p, r, unsure) => `Schwaches Signal zum Parent ${p} (${r} dBm${unsure ? ", vom Gerät selbst gemessen – unsicher" : ""}). Ein Thread-Gerät mit Netzstrom (Steckdose oder Lampe) näher bei diesem Gerät könnte die Verbindung verbessern.`,
    hUnstable: "Mögliche Ursachen der instabilen Verbindung: schwaches Signal zum Parent, Parent war stromlos, Funkstörungen (z. B. WLAN oder andere 2,4-GHz-Geräte in der Nähe) oder eine schwache Batterie.",
    hPowerCut: (n, kids) => `Insgesamt ${n}× neu gestartet – wird wahrscheinlich ab und zu stromlos (z. B. Lampe am Wandschalter oder ausgesteckte Steckdose). Solange er aus ist, kann er keine Nachrichten weiterleiten${kids.length ? `; ${kids.join(", ")} ${kids.length === 1 ? "muss" : "müssen"} sich dann einen neuen Parent suchen` : ""}. Tipp: am Strom lassen und über Home Assistant schalten.`,
    hEdge: r => `Nur schwache Verbindungen zu anderen Routern (beste: ${r} dBm) – liegt am Rand des Netzes. Ein weiterer Router dazwischen würde ihn besser anbinden.`,
  },
};
// German names for common English entity names (only used when the dashboard language is German)
const DE_NAMES = [["Effective current", "Strom (effektiv)"], ["Effective voltage", "Spannung (effektiv)"], ["Active current", "Strom"], ["Current", "Strom"], ["Voltage", "Spannung"],
  ["Power", "Leistung"], ["Energy", "Energie"], ["Battery voltage", "Batteriespannung"], ["Battery", "Batterie"], ["Illuminance", "Helligkeit"],
  ["Occupancy", "Anwesenheit"], ["Door", "Kontakt"], ["Opening", "Kontakt"], ["Temperature", "Temperatur"], ["Humidity", "Luftfeuchte"],
  ["Identify", "Identifizieren"], ["Button", "Taste"], ["Light", "Licht"], ["Switch", "Schalter"]];

// root: document or a shadow root that contains TP_HTML
// opts: { demo, lang }
// host: { embedded, hass(), themeSource(), styleTarget, navigate(path), width(), vis }
function createThreadPulse(root, opts, host) {
  const $ = id => root.getElementById(id);
  const VIS = host.vis;
  const timers = [];
  const every = (fn, ms) => timers.push(setInterval(fn, ms));
  let destroyed = false;
  const DEMO = !!opts.demo;
  let lang = (opts.lang || navigator.language || "en").slice(0, 2);
  let T = TEXT[lang] || TEXT.en;

  // ---------- helpers ----------
  const COLORS = { heat: "#ffb300", br: "#7b1fa2", router: "#1e88e5", end: "#90caf9", sleepy: "#43a047", off: "#9e9e9e", up: "#00bcd4", down: "#e91e63" };
  const QUAL = rssi => rssi >= -65 ? ["#43a047", "g", T.good] : rssi >= -80 ? ["#fb8c00", "o", T.medium] : ["#e53935", "r", T.weak];
  const hex16 = s => BigInt(s).toString(16).padStart(16, "0");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // Icons: Material Design Icons (Pictogrammers), Apache License 2.0 – https://pictogrammers.com/library/mdi/
  const MDI = {
    "power-plug": "M16,7V3H14V7H10V3H8V7H8C7,7 6,8 6,9V14.5L9.5,18V21H14.5V18L18,14.5V9C18,8 17,7 16,7Z",
    "toggle-switch-variant": "M18.4 1.6C18 1.2 17.5 1 17 1H7C6.5 1 6 1.2 5.6 1.6C5.2 2 5 2.5 5 3V21C5 21.5 5.2 22 5.6 22.4C6 22.8 6.5 23 7 23H17C17.5 23 18 22.8 18.4 22.4C18.8 22 19 21.5 19 21V3C19 2.5 18.8 2 18.4 1.6M16 7C16 7.6 15.6 8 15 8H9C8.4 8 8 7.6 8 7V5C8 4.4 8.4 4 9 4H15C15.6 4 16 4.4 16 5V7Z",
    "lightbulb": "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
    "window-closed-variant": "M21 20V2H3V20H1V23H23V20M19 4V11H13V4M5 4H11V11H5M5 20V13H11V20M13 20V13H19V20Z",
    "door": "M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",
    "motion-sensor": "M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M15.67,1A7.33,7.33 0 0,0 23,8.33V7A6,6 0 0,1 17,1H15.67M18.33,1C18.33,3.58 20.42,5.67 23,5.67V4.33C21.16,4.33 19.67,2.84 19.67,1H18.33M21,1A2,2 0 0,0 23,3V1H21M7.92,4.03C7.75,4.03 7.58,4.06 7.42,4.11L2,5.8V11H3.8V7.33L5.91,6.67L2,22H3.8L6.67,13.89L9,17V22H10.8V15.59L8.31,11.05L9.04,8.18L10.12,10H15V8.2H11.38L9.38,4.87C9.08,4.37 8.54,4.03 7.92,4.03Z",
    "gesture-tap-button": "M13 5C15.21 5 17 6.79 17 9C17 10.5 16.2 11.77 15 12.46V11.24C15.61 10.69 16 9.89 16 9C16 7.34 14.66 6 13 6S10 7.34 10 9C10 9.89 10.39 10.69 11 11.24V12.46C9.8 11.77 9 10.5 9 9C9 6.79 10.79 5 13 5M20 20.5C19.97 21.32 19.32 21.97 18.5 22H13C12.62 22 12.26 21.85 12 21.57L8 17.37L8.74 16.6C8.93 16.39 9.2 16.28 9.5 16.28H9.7L12 18V9C12 8.45 12.45 8 13 8S14 8.45 14 9V13.47L15.21 13.6L19.15 15.79C19.68 16.03 20 16.56 20 17.14V20.5M20 2H4C2.9 2 2 2.9 2 4V12C2 13.11 2.9 14 4 14H8V12L4 12L4 4H20L20 12H18V14H20V13.96L20.04 14C21.13 14 22 13.09 22 12V4C22 2.9 21.11 2 20 2Z",
    "access-point-network": "M4.93,3.93C3.12,5.74 2,8.24 2,11C2,13.76 3.12,16.26 4.93,18.07L6.34,16.66C4.89,15.22 4,13.22 4,11C4,8.79 4.89,6.78 6.34,5.34L4.93,3.93M19.07,3.93L17.66,5.34C19.11,6.78 20,8.79 20,11C20,13.22 19.11,15.22 17.66,16.66L19.07,18.07C20.88,16.26 22,13.76 22,11C22,8.24 20.88,5.74 19.07,3.93M7.76,6.76C6.67,7.85 6,9.35 6,11C6,12.65 6.67,14.15 7.76,15.24L9.17,13.83C8.45,13.11 8,12.11 8,11C8,9.89 8.45,8.89 9.17,8.17L7.76,6.76M16.24,6.76L14.83,8.17C15.55,8.89 16,9.89 16,11C16,12.11 15.55,13.11 14.83,13.83L16.24,15.24C17.33,14.15 18,12.65 18,11C18,9.35 17.33,7.85 16.24,6.76M12,9A2,2 0 0,0 10,11A2,2 0 0,0 12,13A2,2 0 0,0 14,11A2,2 0 0,0 12,9M11,15V19H10A1,1 0 0,0 9,20H2V22H9A1,1 0 0,0 10,23H14A1,1 0 0,0 15,22H22V20H15A1,1 0 0,0 14,19H13V15H11Z",
    "lock": "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
    "blinds": "M3,2H21A1,1 0 0,1 22,3V5A1,1 0 0,1 21,6H20V13A1,1 0 0,1 19,14H13V16.17C14.17,16.58 15,17.69 15,19A3,3 0 0,1 12,22A3,3 0 0,1 9,19C9,17.69 9.83,16.58 11,16.17V14H5A1,1 0 0,1 4,13V6H3A1,1 0 0,1 2,5V3A1,1 0 0,1 3,2M12,18A1,1 0 0,0 11,19A1,1 0 0,0 12,20A1,1 0 0,0 13,19A1,1 0 0,0 12,18Z",
    "thermostat": "M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,11.26 15.79,10.57 15.43,10L17.6,7.81C18.5,9 19,10.43 19,12C19,13.93 18.22,15.68 16.95,16.95M12,5C13.57,5 15,5.5 16.19,6.4L14,8.56C13.43,8.21 12.74,8 12,8A4,4 0 0,0 8,12C8,13.1 8.45,14.1 9.17,14.83L7.05,16.95C5.78,15.68 5,13.93 5,12A7,7 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",
    "fan": "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",
    "valve": "M4 22H2V2H4M22 2H20V22H22M17.24 5.34L13.24 9.34A3 3 0 0 0 9.24 13.34L5.24 17.34L6.66 18.76L10.66 14.76A3 3 0 0 0 14.66 10.76L18.66 6.76Z",
    "water-alert": "M10 3.25C10 3.25 16 10 16 14C16 17.31 13.31 20 10 20S4 17.31 4 14C4 10 10 3.25 10 3.25M20 7V13H18V7H20M18 17H20V15H18V17Z",
    "smoke-detector": "M12,18A6,6 0 0,0 18,12C18,8.68 15.31,6 12,6C8.68,6 6,8.68 6,12A6,6 0 0,0 12,18M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19M8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12Z",
    "thermometer": "M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",
    "air-filter": "M19,18.31V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V16.3C4.54,16.12 3.95,16 3,16A1,1 0 0,1 2,15A1,1 0 0,1 3,14C3.82,14 4.47,14.08 5,14.21V12.3C4.54,12.12 3.95,12 3,12A1,1 0 0,1 2,11A1,1 0 0,1 3,10C3.82,10 4.47,10.08 5,10.21V8.3C4.54,8.12 3.95,8 3,8A1,1 0 0,1 2,7A1,1 0 0,1 3,6C3.82,6 4.47,6.08 5,6.21V4A2,2 0 0,1 7,2H17A2,2 0 0,1 19,4V6.16C20.78,6.47 21.54,7.13 21.71,7.29C22.1,7.68 22.1,8.32 21.71,8.71C21.32,9.1 20.8,9.09 20.29,8.71V8.71C20.29,8.71 19.25,8 17,8C15.74,8 14.91,8.41 13.95,8.9C12.91,9.41 11.74,10 10,10C9.64,10 9.31,10 9,9.96V7.95C9.3,8 9.63,8 10,8C11.26,8 12.09,7.59 13.05,7.11C14.09,6.59 15.27,6 17,6V4H7V20H17V18C18.5,18 18.97,18.29 19,18.31M17,10C15.27,10 14.09,10.59 13.05,11.11C12.09,11.59 11.26,12 10,12C9.63,12 9.3,12 9,11.95V13.96C9.31,14 9.64,14 10,14C11.74,14 12.91,13.41 13.95,12.9C14.91,12.42 15.74,12 17,12C19.25,12 20.29,12.71 20.29,12.71V12.71C20.8,13.1 21.32,13.1 21.71,12.71C22.1,12.32 22.1,11.69 21.71,11.29C21.5,11.08 20.25,10 17,10M17,14C15.27,14 14.09,14.59 13.05,15.11C12.09,15.59 11.26,16 10,16C9.63,16 9.3,16 9,15.95V17.96C9.31,18 9.64,18 10,18C11.74,18 12.91,17.41 13.95,16.9C14.91,16.42 15.74,16 17,16C19.25,16 20.29,16.71 20.29,16.71V16.71C20.8,17.1 21.32,17.1 21.71,16.71C22.1,16.32 22.1,15.69 21.71,15.29C21.5,15.08 20.25,14 17,14Z",
    "speaker": "M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M12,20A5,5 0 0,1 7,15A5,5 0 0,1 12,10A5,5 0 0,1 17,15A5,5 0 0,1 12,20M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8C10.89,8 10,7.1 10,6C10,4.89 10.89,4 12,4M17,2H7C5.89,2 5,2.89 5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4C19,2.89 18.1,2 17,2Z",
    "chip": "M6,4H18V5H21V7H18V9H21V11H18V13H21V15H18V17H21V19H18V20H6V19H3V17H6V15H3V13H6V11H3V9H6V7H3V5H6V4M11,15V18H12V15H11M13,15V18H14V15H13M15,15V18H16V15H15Z",
    "help-circle-outline": "M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z",
    "router-wireless": "M20.2,5.9L21,5.1C19.6,3.7 17.8,3 16,3C14.2,3 12.4,3.7 11,5.1L11.8,5.9C13,4.8 14.5,4.2 16,4.2C17.5,4.2 19,4.8 20.2,5.9M19.3,6.7C18.4,5.8 17.2,5.3 16,5.3C14.8,5.3 13.6,5.8 12.7,6.7L13.5,7.5C14.2,6.8 15.1,6.5 16,6.5C16.9,6.5 17.8,6.8 18.5,7.5L19.3,6.7M19,13H17V9H15V13H5A2,2 0 0,0 3,15V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V15A2,2 0 0,0 19,13M8,18H6V16H8V18M11.5,18H9.5V16H11.5V18M15,18H13V16H15V18Z",
    "battery": "M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z"
  };
  function iconImg(icon, bg, size) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 32 32" width="${size}" height="${size}">` +
                `<circle cx="12" cy="12" r="15.5" fill="${bg}" stroke="white" stroke-width="1.2"/>` +
                `<path d="${MDI[icon] || MDI["help-circle-outline"]}" fill="white" transform="translate(3 3) scale(0.75)"/></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  // Icon from what the device does (its entities), not from its name
  function iconFor(entities) {
    const has = (domain, classes) => entities.some(e => e.domain === domain && (!classes || classes.includes(e.dc)));
    const rules = [
      [() => has("lock"), "lock"], [() => has("cover"), "blinds"], [() => has("climate"), "thermostat"], [() => has("fan"), "fan"],
      [() => has("valve"), "valve"], [() => has("light"), "lightbulb"], [() => has("switch", ["outlet"]) || (has("switch") && has("sensor", ["power", "energy", "current"])), "power-plug"],
      [() => has("switch"), "toggle-switch-variant"], [() => has("media_player"), "speaker"],
      [() => has("binary_sensor", ["smoke", "carbon_monoxide", "gas"]), "smoke-detector"],
      [() => has("binary_sensor", ["moisture"]), "water-alert"],
      [() => has("binary_sensor", ["door", "garage_door"]), "door"],
      [() => has("binary_sensor", ["window", "opening"]), "window-closed-variant"],
      [() => has("binary_sensor", ["motion", "occupancy", "presence"]), "motion-sensor"],
      [() => has("event"), "gesture-tap-button"],
      [() => has("sensor", ["pm25", "pm10", "pm1", "carbon_dioxide", "volatile_organic_compounds", "volatile_organic_compounds_parts", "aqi"]), "air-filter"],
      [() => has("sensor", ["temperature", "humidity"]), "thermometer"],
    ];
    for (const [test, icon] of rules) if (test()) return icon;
    return "chip";
  }
  let network = null;

  function theme() {
    try {
      const cs = getComputedStyle(host.themeSource());
      const v = n => cs.getPropertyValue(n).trim();
      const set = (k, val) => { if (val) host.styleTarget.style.setProperty(k, val); };
      set("--bg", v("--card-background-color") || v("--primary-background-color"));
      set("--fg", v("--primary-text-color")); set("--muted", v("--secondary-text-color"));
      set("--line", v("--divider-color")); set("--card", v("--secondary-background-color"));
    } catch (e) {}
  }

  async function getHass() {
    if (!host.embedded) throw Object.assign(new Error(T.noHa), { fatal: true });   // not inside a Home Assistant dashboard
    for (let i = 0; i < 50; i++) {
      try {
        const h = host.hass();
        if (h && h.auth && h.connection) return h;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(T.noHa);
  }
  async function token(hass) {
    if (hass.auth.expired) await hass.auth.refreshAccessToken();
    return hass.auth.accessToken || hass.auth.data.access_token;
  }
  async function diag(hass, entry, devId) {
    const r = await fetch(`/api/diagnostics/config_entry/${entry}/device/${devId}`, { headers: { Authorization: "Bearer " + await token(hass) } });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error(T.notAdmin), { fatal: true });
    if (!r.ok) throw new Error("diagnostics " + r.status);
    // Thread addresses are 64-bit numbers: keep them exact by turning them into strings before parsing
    const txt = (await r.text()).replace(/"0":\s*(\d{15,})/g, '"0":"$1"');
    return JSON.parse(txt).data.node;
  }
  function setLanguage(l) {
    lang = (opts.lang || l || "en").slice(0, 2); T = TEXT[lang] || TEXT.en;
    host.styleTarget.lang = lang;
    $("reload").textContent = T.reload;
    $("roombtn").textContent = roomOn ? T.roomsOff : T.roomsOn;
  $("search").placeholder = T.searchPh;
    $("livebtn").textContent = liveOn ? T.pause : T.resume;
    $("heatbtn").textContent = heatOn ? T.heatOff : T.heatOn;
    const lg = (cls, color, text) => `<span class="lg"><span class="${cls}" style="background:${color}"></span>${text}</span>`;
    $("legend").innerHTML =
      lg("dot", COLORS.br, T.lgBr) + lg("dot", COLORS.router, T.lgRouter) + lg("dot", COLORS.end, T.lgEnd) + lg("dot", COLORS.sleepy, T.lgSleepy) +
      lg("ln", "#43a047", T.good) + lg("ln", "#fb8c00", T.medium) + lg("ln", "#e53935", T.weak) + lg("dot", COLORS.up, T.lgUp) + lg("dot", COLORS.down, T.lgDown) + lg("ln heatln", COLORS.heat, T.lgHeat);
    setList(!$("info").classList.contains("hidden"), false);
    setLegend(!$("legend").classList.contains("hidden"), false);
  }

  // ---------- data from Home Assistant ----------
  // Everything comes from data Home Assistant already has cached (diagnostics, entity registry):
  // no device is queried live, so battery devices are not woken up.
  async function loadHa() {
    const hass = await getHass();
    setLanguage(hass.language || (hass.locale && hass.locale.language));
    let entries;
    try { entries = await hass.callWS({ type: "config_entries/get", domain: "matter" }); }
    catch (e) { throw Object.assign(new Error(T.notAdmin), { fatal: true }); }
    if (!entries.length) throw Object.assign(new Error(T.noMatter), { fatal: true });
    const entry = entries[0].entry_id;
    const [devReg, entReg, areaReg] = await Promise.all([hass.callWS({ type: "config/device_registry/list" }), hass.callWS({ type: "config/entity_registry/list" }),
                                                        hass.callWS({ type: "config/area_registry/list" }).catch(() => [])]);
    const areaName = Object.fromEntries(areaReg.map(x => [x.area_id, x.name]));
    const devs = devReg.filter(d => d.config_entries.includes(entry));
    const entsByDev = {};
    const mainEnts = {};   // entities a user would look at (no diagnostic/config entities, not hidden or disabled)
    for (const e of entReg) if (e.device_id) {
      (entsByDev[e.device_id] = entsByDev[e.device_id] || []).push(e.entity_id);
      if (!e.entity_category && !e.hidden_by && !e.disabled_by) (mainEnts[e.device_id] = mainEnts[e.device_id] || []).push(e.entity_id);
    }
    const st = $("status");
    const nodes = [];
    let done = 0;
    await Promise.all(devs.map(async d => {
      try {
        const node = await diag(hass, entry, d.id), a = node.attributes;
        const iface = (a["0/51/0"] || []).find(x => x["7"] === 4);          // interface type 4 = Thread
        if (!iface || a["0/53/1"] === undefined) return;
        const mac = [...atob(iface["4"])].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
        const role = a["0/53/1"];                                            // 2 sleepy, 3 end device, 4 REED, 5 router, 6 leader
        const type = role >= 5 ? "routing_end_device" : role >= 3 ? "end_device" : "sleepy_end_device";
        const ents = (entsByDev[d.id] || []).map(id => ({ domain: id.split(".")[0], dc: ((hass.states[id] || {}).attributes || {}).device_class }));
        nodes.push({ id: mac, name: d.name_by_user || d.name, icon: iconFor(ents), type, available: node.available,
                     neigh: a["0/53/7"] || [], routes: a["0/53/8"] || [], role, devId: d.id, entities: entsByDev[d.id] || [],
                     mainEntities: mainEnts[d.id] || [], area: areaName[d.area_id] || "",
                     info: { vendor: a["0/40/1"] || d.manufacturer, product: a["0/40/3"] || d.model, sw: a["0/40/10"] || d.sw_version, hw: a["0/40/8"] || d.hw_version,
                             reboots: a["0/51/1"], bootReason: a["0/51/4"], detached: a["0/53/14"], attach: a["0/53/18"], parentChanges: a["0/53/21"],
                             batType: Object.entries(a).filter(([k]) => /^\d+\/47\/19$/.test(k)).map(([, v]) => v).find(Boolean) || "" } });
      } catch (e) { if (e.fatal) throw e; console.warn("Thread Pulse:", d.name, e); }
      st.textContent = `${T.loading} ${++done}/${devs.length}`;
    }));
    if (!nodes.length) throw Object.assign(new Error(T.noDevices), { fatal: true });
    let brExt = null;
    try { brExt = Object.values(await hass.callWS({ type: "otbr/info" }))[0].extended_address.toLowerCase(); } catch (e) {}   // no OTBR add-on
    return { nodes, brExt, hass };
  }

  // ---------- graph ----------
  let searchHits = [], searchActive = false;
  let hintsOf = {}, nodeById = {}, linksOf = {}, battOf = {}, brExt = null, devToNode = {}, entToNode = {}, nodeName = {}, onMap = new Set(), ridToId = {}, routeOf = {}, parentRid = {}, ownRid = {};

  function render(model) {
    const { nodes } = model;
    brExt = model.brExt;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const isRouter = n => n.type === "routing_end_device";
    const visNodes = [], edges = {}, extra = {}, parents = [];
    for (const n of nodes) {
      const color = !n.available ? COLORS.off : isRouter(n) ? COLORS.router : n.type === "end_device" ? COLORS.end : COLORS.sleepy;
      visNodes.push({ id: n.id, label: n.name, shape: "image", image: iconImg(n.icon, color, 64), size: isRouter(n) ? 20 : 14,
                      shapeProperties: { useBorderWithImage: false },
                      title: `${n.name}\n${T.types[n.type] || n.type}${n.available ? "" : T.unreachable}` });
    }
    // router <-> router links (from the routers' neighbour tables, both directions averaged)
    for (const n of nodes.filter(isRouter)) {
      for (const x of n.neigh) {
        if (x["13"]) continue;                                   // children: taken from the child's own view below
        const other = hex16(x["0"]);
        if (!byId[other] && x["11"]) extra[other] = true;        // full Thread device that is not a Matter node of HA
        if (!byId[other] && !extra[other]) continue;
        if (byId[other] && !isRouter(byId[other]) && byId[other].type !== "end_device") continue;
        const key = [n.id, other].sort().join("|");
        (edges[key] = edges[key] || { a: n.id, b: other, rssi: [] }).rssi.push(x["6"]);
      }
    }
    const extras = Object.keys(extra);
    if (!brExt && extras.length === 1) brExt = extras[0];         // no OTBR info: a single unknown router is most likely the border router
    for (const id of extras) {
      const isBr = id === brExt;
      visNodes.push({ id, label: isBr ? T.brLabel : T.foreignLabel(id), shape: "image",
        image: iconImg(isBr ? "access-point-network" : "router-wireless", isBr ? COLORS.br : COLORS.off, 64), size: isBr ? 24 : 16,
        title: isBr ? T.brTitle : T.foreignTitle });
    }
    // child signal as measured by the parent router (sleepy devices report their own RSSI unreliably)
    const childRssi = {};
    for (const n of nodes.filter(isRouter)) for (const x of n.neigh) if (x["13"]) childRssi[n.id + "|" + hex16(x["0"])] = x["6"];
    for (const n of nodes.filter(n => !isRouter(n))) {
      const best = [...n.neigh].sort((p, q) => q["6"] - p["6"])[0];
      if (!best) continue;
      const pid = hex16(best["0"]);
      let rssi = best["6"], src = "device";
      if (childRssi[pid + "|" + n.id] !== undefined) { rssi = childRssi[pid + "|" + n.id]; src = "router"; }
      const pname = byId[pid] ? byId[pid].name : (pid === brExt ? T.brLabel : "…" + pid.slice(-4));
      if (n.type === "end_device") {                             // mains end devices: show all their links like routers
        for (const x of n.neigh) { const o = hex16(x["0"]); if (!byId[o]) continue;
          const key = [n.id, o].sort().join("|"); (edges[key] = edges[key] || { a: n.id, b: o, rssi: [] }).rssi.push(x["6"]); }
      } else {
        edges["p|" + n.id] = { a: n.id, b: pid, rssi: [rssi], parent: true };
      }
      parents.push({ child: n.name, type: n.type, parent: pname, rssi, src });
    }
    const ids = new Set(visNodes.map(v => v.id));
    const avg = e => Math.round(e.rssi.reduce((s, v) => s + v, 0) / e.rssi.length);
    const seenEdge = new Set();
    const visEdges = Object.values(edges).filter(e => ids.has(e.b)).filter(e => { const k = linkKey(e.a, e.b); if (seenEdge.has(k)) return false; seenEdge.add(k); return true; }).map(e => {
      const r = avg(e), [c] = QUAL(r);
      return { id: linkKey(e.a, e.b), rssiTitle: `${r} dBm`, from: e.a, to: e.b, color: { color: c, highlight: c, hover: c, opacity: e.parent ? 0.95 : 0.55 }, width: e.parent ? 3 : 1.5,
               dashes: !!e.parent, title: `${r} dBm`, length: e.parent ? 90 : 180 };
    });
    const fg = getComputedStyle(host.styleTarget).getPropertyValue("--fg").trim() || "#1f2733";
    const data = { nodes: new VIS.DataSet(visNodes), edges: new VIS.DataSet(visEdges) };
    const opts = { nodes: { font: { color: fg, size: 13 } }, edges: { smooth: false },
                   physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -60, springLength: 140 }, stabilization: { iterations: 300 } },
                   interaction: { hover: true, tooltipDelay: 120 } };
    if (network) network.destroy();
    network = new VIS.Network($("net"), data, opts);
    network.once("stabilizationIterationsDone", () => network.fit({ animation: false }));
    network.once("stabilized", () => network.fit({ animation: { duration: 300 } }));
    network.on("beforeDrawing", ctx => { drawRooms(ctx); drawHeat(ctx); });
    if (roomOn) applyRooms(true, false);
    network.on("afterDrawing", ctx => { drawBadges(ctx); drawPackets(ctx); });
    network.on("click", p => { if (p.nodes.length && nodeById[p.nodes[0]]) openPanel(p.nodes[0]); else closePanel(); });
    network.on("hoverNode", () => { $("net").style.cursor = "pointer"; });
    network.on("blurNode", () => { $("net").style.cursor = ""; });
    nodeById = byId;
    linksOf = {};
    const nm = id => (byId[id] || {}).name || (id === brExt ? T.brLabel : "…" + id.slice(-4));
    for (const e of Object.values(edges)) {
      if (!ids.has(e.b)) continue;
      const r = avg(e);
      (linksOf[e.a] = linksOf[e.a] || []).push({ id: e.b, name: nm(e.b), rssi: r, kind: e.parent ? "parent" : "neighbour" });
      (linksOf[e.b] = linksOf[e.b] || []).push({ id: e.a, name: nm(e.a), rssi: r, kind: e.parent ? "child" : "neighbour" });
    }
    refreshBattery(model.hass);
    hintsOf = computeHints(parents);
    onMap = ids;
    buildRouting(nodes);
    devToNode = Object.fromEntries(nodes.filter(n => n.devId).map(n => [n.devId, n.id]));
    entToNode = {}; for (const n of nodes) for (const e of n.entities || []) entToNode[e] = n.id;
    nodeName = Object.fromEntries(nodes.map(n => [n.id, n.name]));
    // table: parents + weak router links
    parents.sort((p, q) => p.rssi - q.rssi);
    const weak = Object.values(edges).filter(e => !e.parent && ids.has(e.b))
      .map(e => ({ a: (byId[e.a] || {}).name || T.brLabel, b: (byId[e.b] || {}).name || (e.b === brExt ? T.brLabel : "…" + e.b.slice(-4)), r: avg(e) }))
      .filter(e => e.r < -80).sort((p, q) => p.r - q.r);
    const allHints = Object.entries(hintsOf).flatMap(([id, hs]) => hs.map(t => [id, t]));
    let h = `<b>${T.hintsHead}</b>` + (allHints.length
      ? `<table>${allHints.map(([id, t]) => `<tr><td style="white-space:nowrap;vertical-align:top"><a href="#" data-open="${id}">${esc(nodeById[id].name)}</a></td><td>${esc(t)}</td></tr>`).join("")}</table>`
      : `<div>${T.noHints}</div>`) + `<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">${T.hintsNote}</div>`;
    hintCount = allHints.length; setList(!$("info").classList.contains("hidden"), false);
    h += `<b>${T.parentsHead}</b> ${T.parentsSub}<table><tr><th>${T.thDevice}</th><th>${T.thVia}</th><th>${T.thSignal}</th></tr>`;
    for (const p of parents.filter(p => p.type !== "end_device")) {
      const [, cls, txt] = QUAL(p.rssi);
      h += `<tr><td>${esc(p.child)}</td><td>${esc(p.parent)}</td><td class="${cls}">${p.rssi} dBm · ${txt}${p.src === "device" ? ` <span style="color:var(--muted)">${T.selfMeasured}</span>` : ""}</td></tr>`;
    }
    h += `</table>`;
    if (weak.length) {
      h += `<br><b>${T.weakHead}</b> ${T.weakSub}<table>`;
      for (const w of weak) h += `<tr><td>${esc(w.a)} ↔ ${esc(w.b)}</td><td class="r">${w.r} dBm</td></tr>`;
      h += `</table>`;
    }
    h += `<br><span style="color:var(--muted);font-size:12px">${T.foot(nodes.length)}</span>`;
    $("info").innerHTML = h;
    const time = new Date().toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    if ($("search").value.trim()) network.once("stabilizationIterationsDone", () => setTimeout(applySearch, 50));
    $("status").textContent = (DEMO ? T.demo + " · " : "") + T.asOf(time, nodes.length) + " · " + T.tapHint + " · v" + VERSION;
  }

  // ---------- live data flow ----------
  // Shown: every message a Matter device sends to Home Assistant (state report) and every command HA sends to a device.
  // Path: device -> its parent router -> (next hops from the routers' route tables) -> border router. Thread picks the
  // route itself; this is the most likely path according to the last route-table snapshot, not a radio capture.
  let packets = [], liveOn = true, unsub = null, recent = [], lastPkt = {}, animating = false;
  const HOP_MS = 550;

  function buildRouting(nodes) {
    ridToId = {}; routeOf = {}; parentRid = {}; ownRid = {};
    for (const n of nodes) for (const x of n.routes) if (x["0"] && x["0"] !== "0") ridToId[x["2"]] = hex16(x["0"]);
    for (const n of nodes) {
      const own = n.routes.find(x => x["3"] === 63 && x["4"] === 0);   // own entry: no next hop, cost 0
      if (n.role >= 5 && own) { ownRid[n.id] = own["2"]; routeOf[own["2"]] = Object.fromEntries(n.routes.map(x => [x["2"], x])); }
      else if (n.routes.length) parentRid[n.id] = (own || n.routes.find(x => x["9"]) || n.routes[0])["2"];
    }
  }
  function pathToBr(nodeId) {
    if (!brExt) return null;
    const br = Object.keys(ridToId).find(r => ridToId[r] === brExt);
    const ids = [nodeId];
    let r = ownRid[nodeId] ?? parentRid[nodeId];
    if (r === undefined || br === undefined) return onMap.has(brExt) ? [nodeId, brExt] : null;
    if (ownRid[nodeId] === undefined) ids.push(ridToId[r]);
    for (let i = 0; i < 6 && String(r) !== br; i++) {
      const e = (routeOf[r] || {})[br];
      // direct link to the border router with usable quality -> one hop; otherwise follow the next hop
      if (!e || (e["9"] && Math.min(e["5"], e["6"]) >= 2) || e["3"] === 63) r = Number(br);
      else r = e["3"];
      ids.push(ridToId[r]);
    }
    const p = ids.filter((id, i) => id && onMap.has(id) && id !== ids[i - 1]);
    return p.length > 1 ? p : null;
  }
  const counts = {};   // per device: timestamps of messages since the page was opened
  // ---------- traffic heat (issue #3) ----------
  // Every message counts on each link of its (computed) path. Shown as a glow under the links, window HEAT_MS.
  // This is an estimate of where traffic flows, based on the most likely paths – not measured radio traffic.
  const HEAT_MS = 10 * 60000;
  let heatOn = true, linkHits = {}, fwdHits = {};
  const linkKey = (a, b) => a < b ? a + "|" + b : b + "|" + a;
  function recordTraffic(path) {
    const t = Date.now();
    for (let i = 0; i < path.length - 1; i++) (linkHits[linkKey(path[i], path[i + 1])] = linkHits[linkKey(path[i], path[i + 1])] || []).push(t);
    for (const id of path.slice(1, -1)) (fwdHits[id] = fwdHits[id] || []).push(t);   // routers in the middle forwarded the message
    if (!animating && network) network.redraw();
  }
  function pruneHeat() {
    const cut = Date.now() - HEAT_MS, cutH = Date.now() - 3600000;
    for (const k in linkHits) { linkHits[k] = linkHits[k].filter(t => t > cut); if (!linkHits[k].length) delete linkHits[k]; }
    for (const k in fwdHits) { fwdHits[k] = fwdHits[k].filter(t => t > cutH); if (!fwdHits[k].length) delete fwdHits[k]; }
  }
  function drawHeat(ctx) {
    if (!heatOn || !network) return;
    const keys = Object.keys(linkHits); if (!keys.length) return;
    const pos = network.getPositions(), max = Math.max(...keys.map(k => linkHits[k].length));
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = COLORS.heat;
    for (const k of keys) {
      const [a, b] = k.split("|"), pa = pos[a], pb = pos[b]; if (!pa || !pb) continue;
      const f = Math.sqrt(linkHits[k].length / max);
      ctx.globalAlpha = 0.10 + 0.30 * f; ctx.lineWidth = 3 + 11 * f; ctx.shadowColor = COLORS.heat; ctx.shadowBlur = 6 + 10 * f;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
    ctx.restore();
  }
  // ---------- room view (issue #8) ----------
  // Calculated layout: every Home Assistant area gets its own spot on a grid, its devices sit in a ring around it,
  // and a coloured area with the room name is drawn behind them. Devices without an area and the border router share
  // one extra spot (top left). Physics is paused while the room view is on; the mesh links are still drawn.
  let roomOn = false, roomTween = null;
  const ROOM_COLORS = ["#42a5f5", "#66bb6a", "#ffa726", "#ab47bc", "#26c6da", "#ec407a", "#9ccc65", "#8d6e63", "#5c6bc0", "#d4e157"];
  const roomsOf = () => {
    const m = {};
    for (const n of Object.values(nodeById)) if (n.area) (m[n.area] = m[n.area] || []).push(n.id);
    return m;
  };
  function applyRooms(on, animate = true) {
    if (!network) return;
    if (roomTween) { cancelAnimationFrame(roomTween); roomTween = null; }
    if (!on) {
      network.setOptions({ physics: { enabled: true } });
      network.stabilize(200);
      let fitted = false;
      const fit = () => { if (!fitted && network && !destroyed) { fitted = true; network.fit({ animation: { duration: 400 } }); } };
      network.once("stabilized", fit);
      setTimeout(fit, 2500);          // in case the simulation keeps moving for a while
      return;
    }
    const rooms = roomsOf(), names = Object.keys(rooms).sort();
    const grouped = new Set(names.flatMap(a => rooms[a]));
    const rest = network.body.data.nodes.getIds().filter(id => !grouped.has(id));
    const isR = id => nodeById[id] && nodeById[id].type === "routing_end_device";
    const groups = names.map(a => rooms[a].slice().sort((a2, b2) => isR(b2) - isR(a2)));   // routers first in the ring
    if (rest.length) groups.unshift(rest);   // first (top left): the bottom left is covered by the live ticker
    const ring = k => k <= 1 ? 0 : 40 + 22 * k;
    const cell = 2 * Math.max(...groups.map(g => ring(g.length))) + 170;
    const st = $("stage"), aspect = st && st.clientHeight ? st.clientWidth / st.clientHeight : 1.5;
    const cols = Math.max(1, Math.round(Math.sqrt(groups.length * aspect)));                  // grid follows the shape of the map area
    const target = {};
    groups.forEach((g, i) => {
      const cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell, r = ring(g.length);
      g.forEach((id, j) => { const a = 2 * Math.PI * j / g.length - Math.PI / 2; target[id] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });
    });
    network.setOptions({ physics: { enabled: false } });
    const from = network.getPositions(), t0 = performance.now(), D = animate ? 600 : 0;
    const step = () => {
      const k = D ? Math.min(1, (performance.now() - t0) / D) : 1, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const id in target) { const f = from[id] || target[id]; network.moveNode(id, f.x + (target[id].x - f.x) * e, f.y + (target[id].y - f.y) * e); }
      if (k < 1 && !destroyed) roomTween = requestAnimationFrame(step);
      else { roomTween = null; network.fit({ animation: animate ? { duration: 400 } : false }); }
    };
    step();
  }
  function hull(points) {     // convex hull (monotone chain)
    const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  let roomCanvas = null;
  function drawRooms(ctx) {
    if (!roomOn || !network) return;
    const rooms = roomsOf(), pos = network.getPositions(), PAD = 34;
    const cv = ctx.canvas;
    if (!roomCanvas) roomCanvas = document.createElement("canvas");
    if (roomCanvas.width !== cv.width || roomCanvas.height !== cv.height) { roomCanvas.width = cv.width; roomCanvas.height = cv.height; }
    const names = Object.keys(rooms).sort();
    const labels = [];
    names.forEach((area, i) => {
      const pts = rooms[area].map(id => pos[id]).filter(Boolean); if (!pts.length) return;
      const color = ROOM_COLORS[i % ROOM_COLORS.length], h = hull(pts);
      // draw the padded blob opaque on a helper canvas, then copy it with low opacity (no darker overlaps inside a room)
      const o = roomCanvas.getContext("2d");
      o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, roomCanvas.width, roomCanvas.height); o.setTransform(ctx.getTransform());
      o.fillStyle = o.strokeStyle = color; o.lineJoin = o.lineCap = "round"; o.lineWidth = PAD * 2;
      o.beginPath(); o.moveTo(h[0].x, h[0].y); for (const q of h.slice(1)) o.lineTo(q.x, q.y); o.closePath(); o.fill(); o.stroke();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.13; ctx.drawImage(roomCanvas, 0, 0); ctx.restore();
      const top = pts.reduce((a, q) => q.y < a.y ? q : a, pts[0]);
      labels.push({ text: area.toUpperCase(), x: pts.reduce((a, q) => a + q.x, 0) / pts.length, y: top.y - PAD - 8, color });
    });
    ctx.save(); ctx.font = "600 12px -apple-system, Segoe UI, Roboto, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    for (const l of labels) { ctx.fillStyle = l.color; ctx.globalAlpha = 0.9; ctx.fillText(l.text, l.x, l.y); }
    ctx.restore();
  }

  function updateEdgeTitles() {
    if (!network) return;
    const ds = network.body.data.edges, upd = [];
    ds.forEach(e => { if (e.room) return; const n = (linkHits[e.id] || []).length; const title = e.rssiTitle + (n ? "\n" + T.heatTitle(n) : ""); if (title !== e.title) upd.push({ id: e.id, title }); });
    if (upd.length) ds.update(upd);
  }
  every(() => { pruneHeat(); updateEdgeTitles(); if (network && !animating) network.redraw(); }, 5000);
  function launch(nodeId, down, html) {
    const now = performance.now(), key = nodeId + down;
    if (lastPkt[key] && now - lastPkt[key] < 400) return;        // one radio message often updates several entities
    lastPkt[key] = now;
    const c = counts[nodeId] = counts[nodeId] || { up: [], down: [], last: null };
    (down ? c.down : c.up).push(Date.now()); c.last = { t: Date.now(), down };
    const cut = Date.now() - 3600000; c.up = c.up.filter(t => t > cut); c.down = c.down.filter(t => t > cut);
    c.total = (c.total || 0) + 1;
    let path = network ? pathToBr(nodeId) : null;
    if (path) {
      if (down) path = path.slice().reverse();
      recordTraffic(path);
    }
    if (panelNode === nodeId) renderPanel();
    if (!liveOn || !network || !path) return;
    packets.push({ path, t0: now, color: down ? COLORS.down : COLORS.up, origin: down ? path[path.length - 1] : nodeId });
    recent.unshift({ t: new Date(), html, down }); recent = recent.slice(0, 60);
    showTicker();
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  }
  function tick() {
    const now = performance.now();
    packets = packets.filter(p => now - p.t0 < (p.path.length - 1) * HOP_MS + 900);
    if (network) network.redraw();
    if (packets.length && !destroyed) requestAnimationFrame(tick); else animating = false;
  }
  // ---------- badges and detail panel ----------
  let panelNode = null;
  function freshHass() { try { return host.hass(); } catch (e) { return null; } }
  function refreshBattery(hass) {
    battOf = {};
    for (const n of Object.values(nodeById)) {
      if (n.demoBattery !== undefined) { battOf[n.id] = n.demoBattery; continue; }
      if (!hass) continue;
      for (const id of n.entities || []) {
        const st = hass.states[id];
        if (st && st.attributes.device_class === "battery" && st.attributes.unit_of_measurement === "%" && !isNaN(parseFloat(st.state))) { battOf[n.id] = Math.round(parseFloat(st.state)); break; }
      }
    }
  }
  function warningsOf(n) {
    const w = [], i = n.info || {};
    if (i.attach >= 5) w.push(T.warnAttach(i.attach));            // thresholds from real networks: normal is 0–2 attempts, 1–2 drop-offs
    if (i.detached >= 3) w.push(T.warnDetached(i.detached));
    if (battOf[n.id] !== undefined && battOf[n.id] < 20) w.push(T.warnBattery(battOf[n.id]));
    return w;
  }
  function pill(ctx, x, y, text, bg) {
    ctx.font = "600 10px -apple-system, Segoe UI, Roboto, sans-serif";
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = bg; ctx.strokeStyle = "white"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y - 7, w, 14, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 4, y + 0.5);
  }
  function drawBadges(ctx) {
    const pos = network.getPositions();
    for (const n of Object.values(nodeById)) {
      const p = pos[n.id]; if (!p) continue;
      const r = n.type === "routing_end_device" ? 20 : 14;
      ctx.save();
      if (searchActive && !searchHits.includes(n.id)) ctx.globalAlpha = 0.18;
      if (battOf[n.id] !== undefined) {
        const b = battOf[n.id];
        pill(ctx, p.x + r * 0.55, p.y + r * 0.75, b + "%", b < 20 ? "#e53935" : b < 40 ? "#fb8c00" : "#607d8b");
      }
      if (!warningsOf(n).length && (hintsOf[n.id] || []).length) {
        const x = p.x + r * 0.75, y = p.y - r * 0.85;
        ctx.fillStyle = "#1e88e5"; ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 10px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("i", x, y + 0.5);
      }
      if (warningsOf(n).length) {
        ctx.fillStyle = "#fb8c00"; ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        const x = p.x + r * 0.75, y = p.y - r * 0.95;
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", x, y + 1.5);
      }
      ctx.restore();
    }
  }
  // ---------- weak-spot hints (issue #10) ----------
  // Rules of thumb from the reported data. Thresholds: signal below −80 dBm is "weak" (same as the link colours);
  // ≥ 5 attach attempts / ≥ 3 drop-offs as for the warnings; ≥ 50 restarts in total for a router suggests it loses power regularly.
  // Note: switching a smart plug off does NOT stop it from routing – only its socket is switched – so that is not a hint.
  function computeHints(parents) {
    const out = {}, add = (id, t) => (out[id] = out[id] || []).push(t);
    const isRouterId = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || id === brExt;
    for (const n of Object.values(nodeById)) {
      const i = n.info || {}, links = linksOf[n.id] || [];
      if (n.type !== "routing_end_device") {
        const par = links.find(l => l.kind === "parent") || links.slice().sort((a, b) => b.rssi - a.rssi)[0];
        const pinfo = parents.find(p => p.child === n.name);
        if (par && par.rssi < -80) add(n.id, T.hWeakParent(par.name, par.rssi, pinfo && pinfo.src === "device"));
      } else {
        if (i.reboots >= 50) {
          const kids = links.filter(l => l.kind === "child").map(l => l.name);
          add(n.id, T.hPowerCut(i.reboots, kids));
        }
        const rl = links.filter(l => l.kind === "neighbour" && isRouterId(l.id));
        if (rl.length) { const best = Math.max(...rl.map(l => l.rssi)); if (best < -80) add(n.id, T.hEdge(best)); }
      }
      if (i.attach >= 5 || i.detached >= 3) add(n.id, T.hUnstable);
    }
    return out;
  }

  function openPanel(id) { panelNode = id; renderPanel(); $("panel").hidden = false; }
  function closePanel() { panelNode = null; $("panel").hidden = true; if (network) network.unselectAll(); }
  function row(k, v) { return v === undefined || v === null || v === "" ? "" : `<dt>${esc(k)}</dt><dd>${v}</dd>`; }
  function rssiTxt(r) { const [, cls, txt] = QUAL(r); return `<span class="${cls}">${r} dBm · ${txt}</span>`; }
  function renderPanel() {
    const n = nodeById[panelNode]; if (!n) return closePanel();
    const i = n.info || {}, hass = DEMO ? null : freshHass();
    if (hass) refreshBattery(hass);
    const color = !n.available ? COLORS.off : n.type === "routing_end_device" ? COLORS.router : n.type === "end_device" ? COLORS.end : COLORS.sleepy;
    let h = `<div class="hd"><img src="${iconImg(n.icon, color, 80)}" alt=""><div><div class="t">${esc(n.name)}</div>` +
            `<div class="s">${esc(T.roles[n.role] || T.types[n.type] || "")}${n.area ? " · " + esc(n.area) : ""}${n.available ? "" : esc(T.unreachable)}</div></div>` +
            `<button class="x" title="×" data-act="close">×</button></div>`;
    for (const w of warningsOf(n)) h += `<div class="warn">⚠ ${esc(w)}</div>`;
    if ((hintsOf[n.id] || []).length) h += `<h4>${T.secHints}</h4>` + hintsOf[n.id].map(t => `<div class="hint">💡 ${esc(t)}</div>`).join("") + `<div class="note">${T.hintsNote}</div>`;
    // live
    const c = counts[n.id], now = Date.now();
    h += `<h4>${T.secLive}</h4><dl>`;
    if (c) {
      const inWin = (arr, ms) => arr.filter(t => now - t < ms).length;
      h += row(T.msgsTotal, `${c.total}`) +
           row(T.msgsMin, `${inWin(c.up, 60000)} ${T.toHa} · ${inWin(c.down, 60000)} ${T.fromHa}`) +
           row(T.msgsHour, `${inWin(c.up, 3600000)} ${T.toHa} · ${inWin(c.down, 3600000)} ${T.fromHa}`) +
           row(T.lastMsg, `${T.ago(Math.round((now - c.last.t) / 1000))} (${c.last.down ? T.fromHa : T.toHa})`);
    } else h += row(T.msgsTotal, T.none);
    if (n.type === "routing_end_device") {
      const f = fwdHits[n.id] || [];
      h += row(T.forwarded, T.forwardedVal(f.filter(t => now - t < HEAT_MS).length, f.length));
    }
    h += `</dl>`;
    // current values
    if (hass && (n.mainEntities || []).length) {
      let v = "";
      for (const id of n.mainEntities.slice(0, 10)) {
        const st = hass.states[id]; if (!st) continue;
        const name = deName((st.attributes.friendly_name || id).replace(n.name, "").trim()) || T.state;
        v += row(name, `${esc(fmtState(st))} <span style="color:var(--muted)">· ${T.ago(Math.max(0, Math.round((now - new Date(st.last_changed)) / 1000)))}</span>`);
      }
      if (v) h += `<h4>${T.secValues}</h4><dl>${v}</dl>`;
    } else if (DEMO && n.demoValues) {
      h += `<h4>${T.secValues}</h4><dl>` + n.demoValues.map(([k, v, ago]) => row(k, `${esc(v)} <span style="color:var(--muted)">· ${T.ago(ago)}</span>`)).join("") + `</dl>`;
    }
    // battery
    if (battOf[n.id] !== undefined || i.batType) {
      const b = battOf[n.id];
      h += `<h4>${T.secBattery}</h4><dl>` + row(T.level, b !== undefined ? `<span class="${b < 20 ? "r" : b < 40 ? "o" : "g"}">${b} %</span>` : "") + row(T.type, esc(i.batType)) + `</dl>`;
    }
    // thread
    const links = (linksOf[n.id] || []).slice().sort((p, q) => q.rssi - p.rssi);
    const par = links.filter(l => l.kind === "parent"), kids = links.filter(l => l.kind === "child"), nb = links.filter(l => l.kind === "neighbour");
    h += `<h4>${T.secThread}</h4><dl>` + row(T.role, esc(T.roles[n.role] || T.types[n.type] || ""));
    for (const l of par) h += row(T.parent, `${esc(l.name)} · ${rssiTxt(l.rssi)}`);
    if (nb.length) h += row(`${T.neighbours} (${nb.length})`, nb.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (kids.length) h += row(`${T.children} (${kids.length})`, kids.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    h += row(T.address, `<span style="font-family:monospace">${esc(n.id)}</span>`) + `</dl><div class="note">${T.stale}</div>`;
    // stability
    if ([i.reboots, i.detached, i.attach, i.parentChanges].some(x => x !== undefined && x !== null)) {
      h += `<h4>${T.secStability}</h4><dl>` + row(T.reboots, i.reboots) + row(T.bootReason, i.bootReason !== undefined && i.bootReason !== null ? esc(T.bootReasons[i.bootReason] || i.bootReason) : "") +
           row(T.detached, i.detached) + row(T.attach, i.attach) + row(T.parentChanges, i.parentChanges) + `</dl><div class="note">${T.sinceRestart}</div>`;
    }
    // device
    h += `<h4>${T.secDevice}</h4><dl>` + row(T.manufacturer, esc(i.vendor || "")) + row(T.model, esc(i.product || "")) +
         row(T.firmware, esc(i.sw || "")) + row(T.hardware, esc(i.hw || "")) + row(T.area, esc(n.area || "")) + `</dl>`;
    if (n.devId && !DEMO) h += `<button class="btn" data-device="${esc(n.devId)}">${T.openDevice} ↗</button>`;
    $("panel").innerHTML = h;
  }
  function openDevice(devId) {
    host.navigate("/config/devices/device/" + devId);
  }
  every(() => { if (panelNode) renderPanel(); }, 5000);
  root.addEventListener("keydown", e => { if (e.key === "Escape" && e.target.id !== "search") closePanel(); });

  // ---------- search (issue #9) ----------
  // Matches device name and area (case and accents ignored). Matches stay bright and are selected, the rest fades out,
  // the map zooms to the matches. Enter opens the first match, Esc clears the search.
  const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function applySearch() {
    if (!network) return;
    const q = norm($("search").value.trim());
    const fg = getComputedStyle(host.styleTarget).getPropertyValue("--fg").trim() || "#1f2733";
    searchActive = !!q;
    searchHits = q ? Object.values(nodeById).filter(n => norm(n.name).includes(q) || norm(n.area).includes(q)).map(n => n.id) : [];
    const hit = new Set(searchHits), upd = [];
    network.body.data.nodes.forEach(v => {
      const on = !q || hit.has(v.id);
      upd.push({ id: v.id, opacity: on ? 1 : 0.18, font: { color: on ? fg : "rgba(128,128,128,.35)" } });
    });
    network.body.data.nodes.update(upd);
    $("hits").textContent = q ? T.hits(searchHits.length) : "";
    if (q && searchHits.length === 1) { network.selectNodes(searchHits); network.focus(searchHits[0], { scale: 1.3, animation: { duration: 400 } }); }
    else if (q && searchHits.length) { network.selectNodes(searchHits); network.fit({ nodes: searchHits, animation: { duration: 400 } }); }
    else if (!q) { network.unselectAll(); network.fit({ animation: { duration: 400 } }); }
  }
  let searchTimer = null;
  $("search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(applySearch, 150); });
  $("search").addEventListener("keydown", e => {
    if (e.key === "Enter" && searchHits.length) { e.preventDefault(); openPanel(searchHits[0]); }
    else if (e.key === "Escape") { e.preventDefault(); $("search").value = ""; applySearch(); $("search").blur(); }
  });
  root.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-open],[data-act],[data-device]"); if (!t) return;
    e.preventDefault();
    if (t.dataset.open) openPanel(t.dataset.open);
    else if (t.dataset.act === "close") closePanel();
    else if (t.dataset.device) openDevice(t.dataset.device);
  });

  function drawPackets(ctx) {
    if (!packets.length) return;
    const now = performance.now(), pos = network.getPositions();
    for (const p of packets) {
      const el = now - p.t0, hops = p.path.length - 1, f = Math.min(el / HOP_MS, hops);
      const i = Math.min(Math.floor(f), hops - 1), k = f - i, a = pos[p.path[i]], b = pos[p.path[i + 1]];
      if (!a || !b) continue;
      // trail along the hops already travelled
      ctx.save(); ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(0, 0.6 - Math.max(0, el - hops * HOP_MS) / 1500);
      ctx.beginPath(); ctx.moveTo(pos[p.path[0]].x, pos[p.path[0]].y);
      for (let j = 1; j <= i; j++) ctx.lineTo(pos[p.path[j]].x, pos[p.path[j]].y);
      ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); ctx.stroke(); ctx.restore();
      // ring around the sender
      const o = pos[p.origin], ring = Math.min(el / 700, 1);
      if (o && ring < 1) { ctx.save(); ctx.strokeStyle = p.color; ctx.globalAlpha = 1 - ring; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(o.x, o.y, 18 + ring * 22, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
      // the packet itself
      if (el <= hops * HOP_MS) { const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
        ctx.save(); ctx.shadowColor = p.color; ctx.shadowBlur = 14; ctx.fillStyle = p.color; ctx.strokeStyle = "white"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
  }
  function showTicker() {
    const now = Date.now(), perMin = recent.filter(r => now - r.t < 60000).length;
    $("live").innerHTML = `<div><b>Live</b> · ${T.perMin(perMin)}</div>` +
      recent.slice(0, 3).map(r => `<div><span style="color:${r.down ? COLORS.down : COLORS.up}">●</span> ${r.t.toLocaleTimeString(lang)} ${r.html}</div>`).join("");
  }
  function deName(t) {
    if (lang !== "de") return t;
    for (const [en, de] of DE_NAMES) if (t.toLowerCase().startsWith(en.toLowerCase())) return de + t.slice(en.length);
    return t;
  }
  function fmtState(st) {
    const u = st.attributes && st.attributes.unit_of_measurement;
    return (T.states[st.state] || st.state) + (u ? " " + u : "");
  }
  async function subscribeLive(hass) {
    if (unsub) return;
    const conn = hass.connection;
    const u1 = await conn.subscribeEvents(ev => {
      const d = ev.data, n = entToNode[d.entity_id];
      if (!n || !d.new_state || !d.old_state || d.new_state.state === "unavailable" || d.old_state.state === "unavailable") return;
      if (d.new_state.state === d.old_state.state && JSON.stringify(d.new_state.attributes) === JSON.stringify(d.old_state.attributes)) return;
      const what = deName((d.new_state.attributes.friendly_name || d.entity_id).replace(nodeName[n], "").trim()) || T.state;
      launch(n, false, `<b>${esc(nodeName[n])}</b> → HA: ${esc(what)} ${esc(fmtState(d.new_state))}`);
    }, "state_changed");
    const u2 = await conn.subscribeEvents(ev => {
      const sd = ev.data.service_data || {};
      const targets = new Set([].concat(sd.entity_id || []).map(e => entToNode[e]).filter(Boolean));
      for (const dv of [].concat(sd.device_id || [])) if (devToNode[dv]) targets.add(devToNode[dv]);
      for (const n of targets) launch(n, true, `HA → <b>${esc(nodeName[n])}</b>: ${esc(ev.data.domain + "." + ev.data.service)}`);
    }, "call_service");
    unsub = () => { u1(); u2(); };
    showTicker();
    every(showTicker, 10000);
  }

  // ---------- demo (invented devices, works without Home Assistant) ----------
  function demoModel() {
    const de = lang === "de";
    let seq = 0x1000;
    const mk = (name, icon, role, extra = {}) => ({ id: "f2a0c0de0000" + (seq++).toString(16), name, icon, role, available: true, neigh: [], routes: [],
      type: role >= 5 ? "routing_end_device" : role >= 3 ? "end_device" : "sleepy_end_device", ...extra });
    const br = { id: "f2a0c0de0000beef" };
    const routers = [mk(de ? "Stehlampe" : "Floor lamp", "lightbulb", 5), mk(de ? "Steckdose Küche" : "Kitchen plug", "power-plug", 5),
      mk(de ? "Deckenlicht Flur" : "Hallway light", "lightbulb", 6), mk(de ? "Steckdose Büro" : "Office plug", "power-plug", 5),
      mk(de ? "Rollladen" : "Blinds", "blinds", 5), mk(de ? "Thermostat" : "Thermostat", "thermostat", 5)];
    const ends = [mk(de ? "Luftreiniger" : "Air purifier", "air-filter", 3), mk(de ? "Lautsprecher" : "Speaker", "speaker", 3)];
    const sleepy = [mk(de ? "Fenster Bad" : "Bathroom window", "window-closed-variant", 2), mk(de ? "Haustür" : "Front door", "door", 2),
      mk(de ? "Bewegung Flur" : "Hallway motion", "motion-sensor", 2), mk(de ? "Taster Bett" : "Bedside button", "gesture-tap-button", 2),
      mk(de ? "Wassermelder" : "Leak sensor", "water-alert", 2), mk(de ? "Klima Schlafzimmer" : "Bedroom climate", "thermometer", 2)];
    const dec = id => BigInt("0x" + id).toString();
    const rid = {}; [...routers, br].forEach((r, i) => rid[r.id] = i * 4 + 3);
    const rnd = (lo, hi) => Math.round(lo + Math.random() * (hi - lo));
    const all = [...routers, br];
    for (const r of routers) {
      for (const o of all) if (o !== r && (Math.random() < 0.75 || (o === br && r === routers[0]))) r.neigh.push({ "0": dec(o.id), "6": rnd(-88, -45), "11": true, "13": false });
      r.routes = all.map(o => ({ "0": dec(o.id), "2": rid[o.id], "3": o === r ? 63 : rid[routers[0].id], "4": o === r ? 0 : 1, "5": 3, "6": 3, "9": o !== r }));
    }
    ends.forEach((e, i) => { const p = routers[i * 2]; e.neigh = [{ "0": dec(p.id), "6": rnd(-70, -50) }, { "0": dec(routers[i * 2 + 1].id), "6": rnd(-80, -60) }];
      e.routes = [{ "0": dec(p.id), "2": rid[p.id], "3": 63, "4": 0, "9": true }]; });
    sleepy.forEach((s, i) => { const p = routers[i % routers.length], rs = rnd(-85, -55);
      s.neigh = [{ "0": dec(p.id), "6": rs }]; s.routes = [{ "0": dec(p.id), "2": rid[p.id], "3": 0, "4": 0, "9": true }];
      p.neigh.push({ "0": dec(s.id), "6": rs, "11": false, "13": true }); });
    sleepy[3].available = false;
    const all2 = [...routers, ...ends, ...sleepy];
    all2.forEach((n, k) => { n.area = de ? ["Wohnzimmer", "Küche", "Flur", "Büro", "Schlafzimmer", "Bad"][k % 6] : ["Living room", "Kitchen", "Hallway", "Office", "Bedroom", "Bathroom"][k % 6];
      n.info = { vendor: "Demo Inc.", product: n.name, sw: "1." + (k % 4) + ".2", hw: "2.0", reboots: 2 + k % 5, bootReason: 1, detached: 1, attach: 1, parentChanges: 0,
                 batType: n.type === "sleepy_end_device" ? (k % 2 ? "CR2032" : "AAA") : "" };
      if (n.type === "sleepy_end_device") n.demoBattery = [88, 64, 100, 15, 42, 97][k % 6];
      const m = 60;
      n.demoValues = n.icon === "power-plug" ? [[de ? "Schalter" : "Switch", T.states.on, 26 * 3600], [de ? "Leistung" : "Power", "42.7 W", 4 * m], [de ? "Energie" : "Energy", "18.304 kWh", 6 * m]]
        : n.icon === "door" || n.icon === "window-closed-variant" ? [[de ? "Kontakt" : "Contact", T.states.closed, 12 * m], [de ? "Batterie" : "Battery", n.demoBattery + " %", 3 * 3600]]
        : n.icon === "thermometer" ? [[de ? "Temperatur" : "Temperature", "21.4 °C", 2 * m], [de ? "Luftfeuchte" : "Humidity", "48 %", 5 * m]]
        : n.icon === "lightbulb" ? [[de ? "Licht" : "Light", T.states.on, 40 * m]] : [[T.state, T.states.off, 90 * m]]; });
    sleepy[1].info.attach = 9; sleepy[1].info.detached = 3;
    routers[2].info.reboots = 140;   // a bulb on a wall switch
    sleepy[2].neigh[0]["6"] = -86;   // weak parent link (as seen by the device and by its parent router)
    for (const r of routers) for (const x of r.neigh) if (x["0"] === dec(sleepy[2].id)) x["6"] = -86;
    return { nodes: [...routers, ...ends, ...sleepy], brExt: br.id };
  }
  function demoTraffic(model) {
    const de = lang === "de";
    const msgs = n => n.icon === "power-plug" ? [de ? "Leistung" : "Power", `${(Math.random() * 120).toFixed(1)} W`]
      : n.icon === "thermometer" || n.icon === "thermostat" ? [de ? "Temperatur" : "Temperature", `${(19 + Math.random() * 4).toFixed(1)} °C`]
      : n.icon === "window-closed-variant" || n.icon === "door" ? [de ? "Kontakt" : "Contact", Math.random() < 0.5 ? T.states.open : T.states.closed]
      : n.icon === "motion-sensor" ? [de ? "Bewegung" : "Motion", Math.random() < 0.5 ? T.states.on : T.states.off]
      : [T.state, Math.random() < 0.5 ? T.states.on : T.states.off];
    const live = model.nodes.filter(n => n.available);
    const step = () => {
      if (destroyed) return;
      const n = live[Math.floor(Math.random() * live.length)];
      if (Math.random() < 0.2 && ["lightbulb", "power-plug", "blinds"].includes(n.icon))
        launch(n.id, true, `HA → <b>${esc(n.name)}</b>: ${n.icon === "blinds" ? "cover.open_cover" : n.icon === "lightbulb" ? "light.toggle" : "switch.toggle"}`);
      else { const [what, val] = msgs(n); launch(n.id, false, `<b>${esc(n.name)}</b> → HA: ${what} ${val}`); }
      setTimeout(step, 600 + Math.random() * 1800);
    };
    setTimeout(step, 1500);
    every(showTicker, 10000);
  }

  // ---------- UI ----------
  let hintCount = 0;
  function setList(show, save = true) {
    $("info").classList.toggle("hidden", !show);
    $("toggle").textContent = (show ? T.hideList : T.showList) + (hintCount ? T.listHints(hintCount) : "");
    if (save) try { localStorage.setItem("threadPulseList", show ? "1" : "0"); } catch (e) {}
    if (network && save) setTimeout(() => { network.redraw(); network.fit({ animation: { duration: 300 } }); }, 50);
  }
  function setLegend(show, save = true) {
    $("legend").classList.toggle("hidden", !show);
    $("legbtn").textContent = show ? T.hideLegend : T.showLegend;
    if (save) try { localStorage.setItem("threadPulseLegend", show ? "1" : "0"); } catch (e) {}
  }
  function showErr(e) {
    setList(true, false);
    $("status").textContent = T.error;
    $("info").innerHTML = `<div id="err">${esc(e.message || e)}</div>`;
  }
  async function load() {
    $("status").textContent = T.loading;
    if (DEMO) { const m = demoModel(); render(m); return m; }
    const m = await loadHa();
    render(m);
    await subscribeLive(m.hass);
    return m;
  }

  theme();
  let startList = false, startLegend = (host.width ? host.width() : window.innerWidth) > 700;
  try { heatOn = localStorage.getItem("threadPulseHeat") !== "0"; roomOn = localStorage.getItem("threadPulseRooms") === "1"; } catch (e) {}
  try { startList = localStorage.getItem("threadPulseList") === "1"; const l = localStorage.getItem("threadPulseLegend"); if (l !== null) startLegend = l === "1"; } catch (e) {}
  $("info").classList.toggle("hidden", !startList);
  $("legend").classList.toggle("hidden", !startLegend);
  setLanguage(lang);
  $("reload").onclick = () => load().catch(showErr);
  $("toggle").onclick = () => setList($("info").classList.contains("hidden"));
  $("roombtn").onclick = () => {
    roomOn = !roomOn; $("roombtn").textContent = roomOn ? T.roomsOff : T.roomsOn;
    try { localStorage.setItem("threadPulseRooms", roomOn ? "1" : "0"); } catch (e) {}
    applyRooms(roomOn);
  };
  $("heatbtn").onclick = () => {
    heatOn = !heatOn; $("heatbtn").textContent = heatOn ? T.heatOff : T.heatOn;
    try { localStorage.setItem("threadPulseHeat", heatOn ? "1" : "0"); } catch (e) {}
    if (network) network.redraw();
  };
  $("legbtn").onclick = () => setLegend($("legend").classList.contains("hidden"));
  $("livebtn").onclick = () => {
    liveOn = !liveOn; $("livebtn").textContent = liveOn ? T.pause : T.resume;
    if (!liveOn) packets = [];
  };
  load().then(m => { if (DEMO) demoTraffic(m); }).catch(showErr);

  return {
    destroy() {
      destroyed = true; timers.forEach(clearInterval);
      if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
      if (network) { network.destroy(); network = null; }
    },
    theme,
  };
}
