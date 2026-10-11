//# Colours, signal quality, icon images, theme, connection to Home Assistant, language switching.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- helpers ----------
  // All colours used by the map, badges and boxes. The CSS gets the semantic ones as variables (--c-<name>), see applyColorVars().
  const COLORS = { good: "#43a047", medium: "#fb8c00", weak: "#e53935", warn: "#fb8c00", hint: "#1e88e5", battOk: "#607d8b", change: "#ab47bc",
                   wifi: "#78909c", heat: "#ffb300", br: "#7b1fa2", router: "#1e88e5", end: "#90caf9", sleepy: "#43a047", off: "#9e9e9e", up: "#00bcd4", down: "#e91e63", update: "#00897b" };
  const QUAL = rssi => rssi >= -65 ? [COLORS.good, "g", T.good] : rssi >= -80 ? [COLORS.medium, "o", T.medium] : [COLORS.weak, "r", T.weak];
  function applyColorVars() { for (const k of ["good", "medium", "weak", "warn", "hint"]) host.styleTarget.style.setProperty("--c-" + k, COLORS[k]); }
  const hex16 = s => BigInt(s).toString(16).padStart(16, "0");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
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
    if (AMBIENT) {               // fixed dark palette, independent of the Home Assistant theme
      const set = (k, val) => host.styleTarget.style.setProperty(k, val);
      set("--bg", "#05070a"); set("--fg", "#cfd6df"); set("--muted", "#7d8794"); set("--line", "#1c232c"); set("--card", "#0d1117");
      return;
    }
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
    const txt = (await r.text()).replace(/"0":\s*(\d{15,})/g, '"0":"$1"').replace(/"0\/53\/4":\s*(\d+)/, '"0/53/4":"$1"');
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
    $("soundbtn").textContent = soundOn ? T.soundOff : T.soundOn; $("volume").title = T.volume;
    $("exportbtn").textContent = T.exportBtn; $("exportbtn").title = T.exportTitle;
    root.querySelector("[data-act=export]").textContent = T.exportPlain; root.querySelector("[data-act=exportanon]").textContent = T.exportAnon;
    root.querySelector("[data-act=report]").textContent = T.reportMenu;
    const lg = (cls, color, text) => `<span class="lg"><span class="${cls}" style="background:${color}"></span>${text}</span>`;
    $("legend").innerHTML =
      lg("dot", COLORS.br, T.lgBr) + lg("dot", COLORS.router, T.lgRouter) + lg("dot", COLORS.end, T.lgEnd) + lg("dot", COLORS.sleepy, T.lgSleepy) +
      lg("ln", COLORS.good, T.good) + lg("ln", COLORS.medium, T.medium) + lg("ln", COLORS.weak, T.weak) + lg("dot", COLORS.up, T.lgUp) + lg("dot", COLORS.down, T.lgDown) + lg("ln heatln", COLORS.heat, T.lgHeat) + `<span class="lg" id="lgwifi" hidden><span class="dot" style="background:${COLORS.wifi}"></span>${T.lgWifi}</span>`;
    setList(!$("info").classList.contains("hidden"), false);
    setLegend(!$("legend").classList.contains("hidden"), false);
  }

