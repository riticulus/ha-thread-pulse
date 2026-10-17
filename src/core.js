// createThreadPulse(root, opts, host): creates one card instance. The parts (one file per topic) are installed in the
// order of PARTS; each gets the object tp that holds the state of this instance and the functions the parts share.
import { textFor } from "./i18n/index.js";
import installPrefs from "./prefs.js";
import installHelpers from "./helpers.js";
import installData from "./data.js";
import installGraph from "./graph.js";
import installRouters from "./routers.js";
import installLive from "./live.js";
import installHeat from "./heat.js";
import installChatty from "./chatty.js";
import installRooms from "./rooms.js";
import installPanel from "./panel.js";
import installIdentify from "./identify.js";
import installHints from "./hints.js";
import installStability from "./stability.js";
import installHealth from "./health.js";
import installWhatif from "./whatif.js";
import installSpectrum from "./spectrum.js";
import installDiagnose from "./diagnose.js";
import installSearch from "./search.js";
import installChanges from "./changes.js";
import installResponse from "./response.js";
import installBattery from "./battery.js";
import installTrends from "./trends.js";
import installFirmware from "./firmware.js";
import installFabrics from "./fabrics.js";
import installWifi from "./wifi.js";
import installSound from "./sound.js";
import installExport from "./export.js";
import installReport from "./report.js";
import installTabs from "./tabs.js";
import installLayout from "./layout.js";
import installDemo from "./demo.js";
import installUi from "./ui.js";
import installAmbient from "./ambient.js";
import installStart from "./start.js";

// the parts in the order they are installed – each one can use what the earlier ones put on tp
const PARTS = [
  installPrefs,
  installHelpers,
  installData,
  installGraph,
  installRouters,
  installLive,
  installHeat,
  installChatty,
  installRooms,
  installPanel,
  installIdentify,
  installHints,
  installStability,
  installHealth,
  installWhatif,
  installSpectrum,
  installDiagnose,
  installSearch,
  installChanges,
  installResponse,
  installBattery,
  installTrends,
  installFirmware,
  installFabrics,
  installWifi,
  installSound,
  installExport,
  installReport,
  installTabs,
  installLayout,
  installDemo,
  installUi,
  installAmbient,
];

// root: document or a shadow root that contains TP_HTML
// opts: { demo, lang, ambient, ambientMotion, showWifi, hintDays }
// host: { embedded, hass(), themeSource(), styleTarget, navigate(path), width(), vis }
export function createThreadPulse(root, opts, host) {
  const tp = { root, opts, host }; // the state of this card instance, shared by all parts

  const $ = id => root.getElementById(id);
  tp.$ = $;
  const VIS = host.vis;
  tp.VIS = VIS;
  const timers = [];
  tp.timers = timers;
  const every = (fn, ms) => timers.push(setInterval(fn, ms));
  tp.every = every;
  tp.destroyed = false;
  const DEMO = !!opts.demo;
  tp.DEMO = DEMO;
  const SHOW_WIFI = opts.showWifi !== false;
  tp.SHOW_WIFI = SHOW_WIFI;
  const AMBIENT = !!opts.ambient,
    AMBIENT_MOTION = AMBIENT && opts.ambientMotion !== false;
  tp.AMBIENT_MOTION = AMBIENT_MOTION;
  tp.AMBIENT = AMBIENT;
  tp.lang = (opts.lang || navigator.language || "en").slice(0, 2);
  tp.T = textFor(tp.lang);
  for (const install of PARTS) install(tp);
  return installStart(tp);
}
