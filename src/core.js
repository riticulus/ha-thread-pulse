//# createThreadPulse(root, opts, host): start of the function and the state shared by all parts.
//# The feature files (helpers.js … ambient.js) and start.js are placed after this by build.py; build.py also adds the closing brace.
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
  const AMBIENT = !!opts.ambient, AMBIENT_MOTION = AMBIENT && opts.ambientMotion !== false;
  let lang = (opts.lang || navigator.language || "en").slice(0, 2);
  let T = TEXT[lang] || TEXT.en;

