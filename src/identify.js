//# Identify button in the detail panel (issue #4).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- identify (issue #4) ----------
  // Matter devices with the Identify cluster get an "identify" button entity in Home Assistant (device class identify,
  // a config entity). Pressing it makes the device blink, beep or flash for a few seconds. This is a real command to the
  // device, so the button says so; the command is animated like every other command (call_service event).
  const IDENTIFY_LOCK = 4000;                   // ms the button stays disabled after a press (no accidental double press)
  let identifyState = null;                     // { id, until, text, ok } – survives the panel refresh every 5 s
  function identifyEntity(dev, hass) {
    if (DEMO) return dev.demoIdentify && dev.available ? "button.demo_identify" : null;    // like the real entity: unavailable while the device is
    if (!hass) return null;
    return (dev.entities || []).filter(e => e.startsWith("button.") && hass.states[e] &&
      hass.states[e].attributes.device_class === "identify" && hass.states[e].state !== "unavailable").sort()[0] || null;
  }
  function identifyHtml(dev, hass) {
    const ent = identifyEntity(dev, hass);
    if (!ent) return "";
    const s = identifyState && identifyState.id === dev.id && Date.now() < identifyState.until ? identifyState : null;
    return `<div class="ident"><button class="btn" data-identify="${esc(dev.id)}"${s ? " disabled" : ""}>${T.identifyBtn}</button>` +
           (s ? ` <span class="${s.ok ? "g" : "r"}">${esc(s.text)}</span>` : "") +
           `<div class="note">${T.identifyNote}${dev.type === "sleepy_end_device" ? " " + T.identifySleepy : ""}</div></div>`;
  }
  async function pressIdentify(id) {
    const dev = nodeById[id] || wifiById[id]; if (!dev) return;
    const hass = DEMO ? null : freshHass(), ent = identifyEntity(dev, hass);
    if (!ent || (identifyState && identifyState.id === id && Date.now() < identifyState.until)) return;
    const done = (ok, text) => {
      const ms = ok ? IDENTIFY_LOCK : 8000;
      identifyState = { id, until: Date.now() + ms, text, ok };
      if (panelNode === id) renderPanel();
      setTimeout(() => { if (!destroyed && panelNode === id) renderPanel(); }, ms + 50);    // unlock the button right away
    };
    identifyState = { id, until: Date.now() + IDENTIFY_LOCK, text: T.identifySending, ok: true }; renderPanel();
    if (DEMO) { launch(id, true, `HA → <b>${esc(dev.name)}</b>: button.press`); done(true, T.identifySent); return; }
    try { await hass.callService("button", "press", { entity_id: ent }); done(true, T.identifySent); }
    catch (e) { done(false, T.identifyFailed + ((e && e.message) ? ": " + e.message : "")); }
  }
