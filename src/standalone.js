// ---------- standalone page: runs in an iframe inside a Home Assistant dashboard ----------
// Bundled into dist/thread-pulse.html (template: src/standalone.html). URL parameters: see CONTRIBUTING.md.
import TP_CSS from "./styles.css";
import TP_HTML from "./markup.html";
import { createThreadPulse } from "./core.js";

const params = new URLSearchParams(location.search);
const style = document.createElement("style");
style.textContent =
  TP_CSS +
  `
  html, body { margin: 0; height: 100%; background: var(--bg); }`;
document.head.appendChild(style);
document.body.insertAdjacentHTML("afterbegin", TP_HTML);
const haRoot = () => parent.document.querySelector("home-assistant");
createThreadPulse(
  document,
  {
    demo: params.has("demo") && (params.get("demo") || true),
    lang: params.get("lang"),
    ambient: params.has("ambient"),
    showWifi: !params.has("nowifi"),
    ambientMotion: !params.has("still"),
    hintDays: params.get("hintdays"),
  },
  {
    embedded: window.parent !== window,
    hass: () => haRoot().hass,
    themeSource: () => parent.document.documentElement,
    styleTarget: document.documentElement,
    navigate: path => {
      try {
        parent.history.pushState(null, "", path);
        parent.dispatchEvent(new CustomEvent("location-changed"));
      } catch (e) {
        window.open(path, "_top");
      }
    },
    width: () => window.innerWidth,
    vis: window.vis,
  },
);
