// Settings remembered by the browser (issue #50).
// Installed by createThreadPulse() (core.js) first, so all other parts can use it.

export default function install(tp) {
  // ---------- settings remembered by the browser (issue #50) ----------
  // One place for every key, type and default. Values are stored in localStorage per browser and per Home Assistant
  // address; formats are unchanged from earlier versions ("1"/"0", numbers, JSON), so existing settings keep working.
  // All access is safe when storage is blocked (e.g. private mode): reads return the default, writes are skipped.
  const PREFS = {
    legend: { key: "threadPulseLegend", type: "bool", def: null }, // default depends on the width – passed by the caller
    heat: { key: "threadPulseHeat", type: "bool", def: true }, // traffic heat
    rooms: { key: "threadPulseRooms", type: "bool", def: false }, // room view
    sound: { key: "threadPulseSound", type: "bool", def: false },
    volume: { key: "threadPulseVolume", type: "number", def: 0.4 },
    tapped: { key: "threadPulseTapped", type: "bool", def: false }, // a device was opened once – no tap hint in the status line
    tab: { key: "threadPulseTab", type: "json", def: "overview" }, // tab of the panel below the map (#108)
    changesSeen: { key: "threadPulseChangesSeen", type: "number", def: null }, // change log last viewed – counter on its tab
    signal: { key: "threadPulseSignal", type: "json", def: null }, // signal trend – only when Home Assistant refuses to store it (#38)
    resp: { key: "threadPulseResp", type: "bool", def: false }, // response times on the map (#89)
    counters: { key: "threadPulseCounters", type: "json", def: null }, // stability counters – only when Home Assistant refuses to store them (#24)
    changes: { key: "threadPulseChanges", type: "json", def: [] }, // change log – only until it is moved to Home Assistant (#86)
  };
  const prefs = {
    get(name, fallback) {
      const p = PREFS[name],
        def = fallback !== undefined ? fallback : p.def;
      let raw = null;
      try {
        raw = localStorage.getItem(p.key);
      } catch (e) {}
      if (raw === null) return p.type === "json" ? JSON.parse(JSON.stringify(def)) : def;
      if (p.type === "bool") return raw === "1" ? true : raw === "0" ? false : def;
      if (p.type === "number") {
        const v = parseFloat(raw);
        return isNaN(v) ? def : v;
      }
      try {
        return JSON.parse(raw);
      } catch (e) {
        return JSON.parse(JSON.stringify(def));
      }
    },
    set(name, value) {
      const p = PREFS[name];
      const raw = p.type === "bool" ? (value ? "1" : "0") : p.type === "number" ? String(value) : JSON.stringify(value);
      try {
        localStorage.setItem(p.key, raw);
      } catch (e) {}
    },
    remove(name) {
      try {
        localStorage.removeItem(PREFS[name].key);
      } catch (e) {}
    },
  };
  tp.prefs = prefs;
}
