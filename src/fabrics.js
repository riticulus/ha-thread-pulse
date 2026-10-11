//# Matter fabrics: which systems a device is connected to (issue #79).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- connected systems (issue #79) ----------
  // A Matter device can be controlled by several systems at once (fabrics): Home Assistant, Apple, Google, Amazon …
  // The cached diagnostics only list Home Assistant's own fabric (the list is filtered per fabric), but they contain the
  // number of fabrics (0/62/3). The full list comes from matter/node_diagnostics, which may query the device – so it is
  // loaded only when the device's panel is opened, once per device and page.
  const fabricsOf = {};                         // device id on the map → { state: "loading" | "ok" | "error", list, own }
  function loadFabrics(dev) {
    if (fabricsOf[dev.id]) return;
    if (DEMO) { fabricsOf[dev.id] = { state: "ok", list: dev.demoFabrics || [], own: 2 }; return; }
    const hass = freshHass();
    if (!hass || !dev.devId) return;
    fabricsOf[dev.id] = { state: "loading" };
    hass.callWS({ type: "matter/node_diagnostics", device_id: dev.devId })
      .then(r => { fabricsOf[dev.id] = { state: "ok", list: r.active_fabrics || [], own: r.active_fabric_index }; })
      .catch(() => { fabricsOf[dev.id] = { state: "error" }; })
      .finally(() => { if (panelNode === dev.id) renderPanel(); });
  }
  function fabricsHtml(dev) {                   // section in the detail panel
    const count = (dev.info || {}).fabrics;
    if (count === undefined || count === null) return "";
    loadFabrics(dev);
    const f = fabricsOf[dev.id] || {};
    const name = x => (x.vendor_name || T.fabricVendor(x.vendor_id)) + (x.fabric_label ? ` (${x.fabric_label})` : "");
    const list = f.state === "ok" && f.list.length
      ? f.list.map(x => esc(name(x)) + (x.fabric_index === f.own ? ` <span style="color:var(--muted)">· ${T.fabricThis}</span>` : "")).join("<br>")
      : f.state === "loading" ? `<span style="color:var(--muted)">${T.fabricLoading}</span>`
      : f.state === "error" ? `<span style="color:var(--muted)">${T.fabricError}</span>` : "";
    return `<h4>${T.secFabrics}</h4><dl>` + row(T.fabricCount, String(count)) + row(T.fabricList, list) + `</dl><div class="note">${T.fabricNote}</div>`;
  }
