// Matter fabrics: which systems a device is connected to (issue #79).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { DEMO, esc, freshHass, renderPanel, row } = tp;
  Object.assign(tp, { fabricsHtml });
  // ---------- connected systems (issue #79) ----------
  // A Matter device can be controlled by several systems at once (fabrics): Home Assistant, Apple, Google, Amazon …
  // The cached diagnostics only list Home Assistant's own fabric (the list is filtered per fabric), but they contain the
  // number of fabrics (0/62/3). The full list comes from matter/node_diagnostics, which may query the device – so it is
  // loaded only when the device's panel is opened, once per device and page.
  const fabricsOf = {}; // device id on the map → { state: "loading" | "ok" | "error", list, own }
  function loadFabrics(dev) {
    if (fabricsOf[dev.id]) return;
    if (DEMO) {
      fabricsOf[dev.id] = { state: "ok", list: dev.demoFabrics || [], own: 2 };
      return;
    }
    const hass = freshHass();
    if (!hass || !dev.devId) return;
    fabricsOf[dev.id] = { state: "loading" };
    hass
      .callWS({ type: "matter/node_diagnostics", device_id: dev.devId })
      .then(r => {
        fabricsOf[dev.id] = { state: "ok", list: r.active_fabrics || [], own: r.active_fabric_index };
      })
      .catch(() => {
        fabricsOf[dev.id] = { state: "error" };
      })
      .finally(() => {
        if (tp.panelNode === dev.id) renderPanel();
      });
  }
  function fabricsHtml(dev) {
    // section in the detail panel
    const count = (dev.info || {}).fabrics;
    if (count === undefined || count === null) return "";
    loadFabrics(dev);
    const f = fabricsOf[dev.id] || {};
    const name = x =>
      (x.vendor_name || tp.T.fabricVendor(x.vendor_id)) + (x.fabric_label ? ` (${x.fabric_label})` : "");
    const list =
      f.state === "ok" && f.list.length
        ? f.list
            .map(
              x =>
                esc(name(x)) +
                (x.fabric_index === f.own ? ` <span style="color:var(--muted)">· ${tp.T.fabricThis}</span>` : ""),
            )
            .join("<br>")
        : f.state === "loading"
          ? `<span style="color:var(--muted)">${tp.T.fabricLoading}</span>`
          : f.state === "error"
            ? `<span style="color:var(--muted)">${tp.T.fabricError}</span>`
            : "";
    return (
      `<h4>${tp.T.secFabrics}</h4><dl>` +
      row(tp.T.fabricCount, String(count)) +
      row(tp.T.fabricList, list) +
      `</dl><div class="note">${tp.T.fabricNote}</div>`
    );
  }
}
