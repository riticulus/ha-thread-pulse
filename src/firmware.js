// Firmware overview and update badge (issue #81).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { COLORS, DEMO, esc, every, freshHass, renderChanges } = tp;
  Object.assign(tp, { drawUpdateBadge, firmwareListHtml, refreshFirmware, updateOf, updateText });
  // ---------- firmware (issue #81) ----------
  // Matter devices have an update entity in Home Assistant (device class firmware): state "on" = an update is
  // available and not skipped. Thread Pulse only shows it – installing stays in Home Assistant.
  tp.fwOf = {}; // device id on the map → { installed, latest, available, skipped, progress }
  function updateOf(dev, hass) {
    if (DEMO) return dev.demoUpdate || null;
    if (!hass) return null;
    const ent = (dev.entities || []).filter(e => e.startsWith("update.")).sort()[0],
      st = ent && hass.states[ent];
    if (!st || st.state === "unavailable") return null;
    const a = st.attributes;
    return {
      installed: a.installed_version || "",
      latest: a.latest_version || "",
      available: st.state === "on",
      skipped:
        !!a.skipped_version && a.skipped_version === a.latest_version && a.latest_version !== a.installed_version,
      progress: a.in_progress ? (typeof a.update_percentage === "number" ? a.update_percentage : true) : null,
    };
  }
  function refreshFirmware(hass) {
    tp.fwOf = {};
    for (const d of [...Object.values(tp.nodeById), ...Object.values(tp.wifiById)]) {
      const u = updateOf(d, hass);
      if (u) tp.fwOf[d.id] = u;
    }
  }
  if (!DEMO)
    every(() => {
      // update states change in Home Assistant, not on the map – check every minute
      if (!tp.network || tp.destroyed) return;
      refreshFirmware(freshHass());
      tp.renderList();
      renderChanges();
      tp.network.redraw();
    }, 60000);
  function updateText(u) {
    // panel row "Update"
    if (!u) return "";
    if (u.progress !== null)
      return esc(tp.T.fwInstalling(u.latest, typeof u.progress === "number" ? u.progress : null));
    if (u.available) return `<span class="o">${esc(tp.T.fwAvailable(u.latest))}</span>`;
    if (u.skipped) return esc(tp.T.fwSkipped(u.latest));
    return `<span class="g">${esc(tp.T.fwCurrent)}</span>`;
  }
  function drawUpdateBadge(ctx, p, r, id) {
    // small arrow at the top left of a device with an update
    const u = tp.fwOf[id];
    if (!u || (!u.available && u.progress === null)) return;
    const x = p.x - r * 0.75,
      y = p.y - r * 0.85;
    ctx.fillStyle = COLORS.update;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.progress !== null ? "…" : "↑", x, y + 0.5);
  }
  function firmwareListHtml() {
    // section in the list below the map
    const devs = [...Object.values(tp.nodeById), ...Object.values(tp.wifiById)];
    const pending = devs.filter(
      d => tp.fwOf[d.id] && (tp.fwOf[d.id].available || tp.fwOf[d.id].skipped || tp.fwOf[d.id].progress !== null),
    );
    const groups = {};
    for (const d of devs) {
      const i = d.info || {};
      if (!i.sw || !i.product) continue;
      const key = `${i.vendor || ""} ${i.product}`.trim();
      ((groups[key] = groups[key] || {})[i.sw] = groups[key][i.sw] || []).push(d.name);
    }
    const mixed = Object.entries(groups).filter(([, v]) => Object.keys(v).length > 1);
    if (!pending.length && !mixed.length) return "";
    let h = `<br><b>${tp.T.fwHead}</b>`;
    if (pending.length)
      h +=
        `<table>` +
        pending
          .map(
            d =>
              `<tr><td><a href="#" data-open="${esc(d.id)}">${esc(d.name)}</a></td>` +
              `<td>${esc(tp.fwOf[d.id].installed)} → ${esc(tp.fwOf[d.id].latest)}</td><td>${updateText(tp.fwOf[d.id])}</td></tr>`,
          )
          .join("") +
        `</table>`;
    if (mixed.length)
      h +=
        `<div style="margin-top:6px">${tp.T.fwMixed}</div><table>` +
        mixed
          .map(
            ([model, v]) =>
              `<tr><td>${esc(model)}</td><td>` +
              Object.entries(v)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([sw, names]) => `${esc(sw)} (${names.length <= 3 ? names.map(esc).join(", ") : names.length})`)
                .join(" · ") +
              `</td></tr>`,
          )
          .join("") +
        `</table>`;
    return h + `<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">${tp.T.fwNote}</div>`;
  }
}
