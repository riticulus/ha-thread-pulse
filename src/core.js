//# createThreadPulse(root, opts, host): start of the function and the state shared by all parts.
//# The feature files (helpers.js … ambient.js) and start.js are placed after this by build.py; build.py also adds the closing brace.
// root: document or a shadow root that contains TP_HTML
// opts: { demo, lang }
// host: { embedded, hass(), themeSource(), styleTarget, navigate(path), width(), vis }
// Texts of a language. Keys missing in a translation come from English (also inside objects such as roles), so a
// new feature only needs its English texts – the other languages can follow later (tests/check-i18n.js lists them).
const TEXT_CACHE = {};
function textFor(code) {
  const en = TEXT.en,
    t = TEXT[code];
  if (!t || t === en) return en;
  if (TEXT_CACHE[code]) return TEXT_CACHE[code];
  const isObj = v => v && typeof v === "object" && !Array.isArray(v),
    out = { ...en };
  for (const [k, v] of Object.entries(t)) out[k] = isObj(v) && isObj(en[k]) ? { ...en[k], ...v } : v;
  return (TEXT_CACHE[code] = out);
}
function createThreadPulse(root, opts, host) {
  const $ = id => root.getElementById(id);
  const VIS = host.vis;
  const timers = [];
  const every = (fn, ms) => timers.push(setInterval(fn, ms));
  let destroyed = false;
  const DEMO = !!opts.demo;
  const SHOW_WIFI = opts.showWifi !== false;
  const AMBIENT = !!opts.ambient,
    AMBIENT_MOTION = AMBIENT && opts.ambientMotion !== false;
  let lang = (opts.lang || navigator.language || "en").slice(0, 2);
  let T = textFor(lang);
