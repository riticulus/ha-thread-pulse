
// ---------- dashboard card: <thread-pulse-card>, installed with HACS ----------
// The graph library is loaded only when a card is actually shown, from the same folder as this file.
const TP_BASE = new URL(".", import.meta.url).href;
let tpVisPromise = null;
function tpLoadVis() {
  if (window.vis && window.vis.Network) return Promise.resolve(window.vis);
  if (!tpVisPromise) tpVisPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TP_BASE + "thread-pulse-vis-network.js?v=9.1.9";
    s.onload = () => resolve(window.vis);
    s.onerror = () => { tpVisPromise = null; reject(new Error("Thread Pulse: could not load " + s.src)); };
    document.head.appendChild(s);
  });
  return tpVisPromise;
}

class ThreadPulseCard extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (this._tp) this._restart();
  }
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._tp && this._dark !== (hass.themes && hass.themes.darkMode)) { this._dark = hass.themes && hass.themes.darkMode; requestAnimationFrame(() => this._tp && this._tp.theme()); }
    if (first && this.isConnected) this._start();
  }
  connectedCallback() { if (this._hass && !this._tp) this._start(); }
  disconnectedCallback() { this._stop(); }
  _restart() { this._stop(); this._start(); }
  _stop() { if (this._tp) { this._tp.destroy(); this._tp = null; } this._starting = false; }
  async _start() {
    if (this._tp || this._starting || !this._config) return;
    this._starting = true;
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const h = this._config.height;
    root.innerHTML = `<style>${TP_CSS}
      :host { display: block; height: ${h ? h : "100%"}; min-height: ${h ? "0" : "450px"}; }
      ha-card { height: 100%; overflow: hidden; }
      #wrap { background: transparent; }</style><ha-card>${TP_HTML}</ha-card>`;
    let vis;
    try { vis = await tpLoadVis(); }
    catch (e) { root.querySelector("#status").textContent = e.message; this._starting = false; return; }
    if (!this._starting) return;            // removed while loading
    this._dark = this._hass.themes && this._hass.themes.darkMode;
    this._tp = createThreadPulse(root, { demo: !!this._config.demo, lang: this._config.language || "", ambient: !!this._config.ambient, ambientMotion: this._config.ambient_motion !== false }, {
      embedded: true,
      hass: () => this._hass,
      themeSource: () => this,
      styleTarget: this,
      navigate: path => { history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed")); },
      width: () => this.clientWidth || window.innerWidth,
      vis,
    });
    this._starting = false;
  }
  getCardSize() { return 10; }
  getGridOptions() { return { columns: 12, rows: 10, min_columns: 6, min_rows: 6 }; }
  static getStubConfig() { return {}; }
  static getConfigForm() {
    return {
      schema: [
        { name: "height", selector: { text: {} } },
        { name: "language", selector: { select: { mode: "dropdown", options: [
          { value: "", label: "Home Assistant language" }, { value: "en", label: "English" }, { value: "de", label: "Deutsch" },
          { value: "fr", label: "Français" }, { value: "it", label: "Italiano" }, { value: "es", label: "Español" }, { value: "nl", label: "Nederlands" }] } } },
        { name: "ambient", selector: { boolean: {} } },
        { name: "ambient_motion", selector: { boolean: {} } },
        { name: "demo", selector: { boolean: {} } },
      ],
      computeLabel: s => ({ height: "Height (e.g. 600px or calc(100vh - 120px); empty = fill the space)", language: "Language", ambient: "Ambient mode for wall tablets (only the mesh, dark)", ambient_motion: "Ambient mode: slow automatic zoom (default on)", demo: "Demo mode (invented devices)" })[s.name],
    };
  }
}
if (!customElements.get("thread-pulse-card")) customElements.define("thread-pulse-card", ThreadPulseCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "thread-pulse-card"))
  window.customCards.push({ type: "thread-pulse-card", name: "Thread Pulse", preview: false,
    description: "Live map of your Thread network: Matter devices, signal strength and messages as they happen.",
    documentationURL: "https://github.com/riticulus/ha-thread-pulse" });
console.info(`%c THREAD PULSE %c ${VERSION} `, "color:white;background:#7b1fa2;font-weight:600", "color:#7b1fa2;background:white");
